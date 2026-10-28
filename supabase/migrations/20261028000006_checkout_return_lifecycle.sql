-- ==============================================================================
-- Migration: 20261028000006_checkout_return_lifecycle.sql
-- Description: Resource checkout, return confirmation, condition inspections,
--              overdue tracking, incident reporting, and in-app notifications.
-- Platform: Supabase PostgreSQL (TechCircuit Hackathon)
-- ==============================================================================

-- 1. STORAGE BUCKET FOR CONDITION INSPECTION & EVIDENCE PHOTOS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'condition-photos',
  'condition-photos',
  true,
  5242880, -- 5 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Storage access policies for condition-photos
DROP POLICY IF EXISTS "Public or participants can view condition photos" ON storage.objects;
CREATE POLICY "Public or participants can view condition photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'condition-photos');

DROP POLICY IF EXISTS "Authenticated users can upload condition photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload condition photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'condition-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 2. EXTEND CONDITION REPORTS SCHEMA
DO $$ BEGIN
  ALTER TABLE public.condition_reports
    ADD COLUMN IF NOT EXISTS resource_id UUID REFERENCES public.resources(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS issues_flagged BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS issue_types TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS safety_acknowledged BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_late BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS late_minutes INT NOT NULL DEFAULT 0;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_condition_reports_booking_stage
  ON public.condition_reports(booking_id, stage);

-- 3. EXTEND INCIDENTS SCHEMA
DO $$ BEGIN
  ALTER TABLE public.incidents
    ADD COLUMN IF NOT EXISTS resource_id UUID REFERENCES public.resources(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS photos JSONB NOT NULL DEFAULT '[]'::jsonb;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_resource ON public.incidents(resource_id);

-- 4. IN-APP PERSISTENT NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'booking',
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_lookup
  ON public.notifications(user_id, is_read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can mark own notifications read" ON public.notifications;
CREATE POLICY "Users can mark own notifications read"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 5. COMPLETE LIFECYCLE STATUS TRANSITION TRIGGER
CREATE OR REPLACE FUNCTION public.validate_booking_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  v_unresolved_checks INT;
  v_resource_owner UUID;
  v_is_admin BOOLEAN;
  v_current_user UUID;
  v_open_incidents INT;
BEGIN
  -- If status hasn't changed, allow update
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  v_current_user := auth.uid();
  SELECT owner_id INTO v_resource_owner FROM public.resources WHERE id = OLD.resource_id;
  v_is_admin := public.is_admin(v_current_user);

  -- Terminal statuses cannot transition to anything
  IF OLD.status IN ('rejected', 'cancelled', 'completed') THEN
    RAISE EXCEPTION 'Cannot modify booking in terminal status "%"', OLD.status;
  END IF;

  -- 1. Cancellation
  IF NEW.status = 'cancelled' THEN
    IF v_current_user != OLD.borrower_id AND v_current_user != v_resource_owner AND NOT v_is_admin THEN
      RAISE EXCEPTION 'Unauthorized to cancel this booking';
    END IF;

    IF OLD.status NOT IN ('requested', 'waitlisted', 'approved') THEN
      RAISE EXCEPTION 'Cannot cancel booking in status "%"', OLD.status;
    END IF;

    NEW.decision_at := timezone('utc'::text, now());
    RETURN NEW;
  END IF;

  -- 2. Decisions: approved, rejected, waitlisted
  IF NEW.status IN ('approved', 'rejected', 'waitlisted') THEN
    IF v_current_user IS NOT NULL AND v_current_user != v_resource_owner AND NOT v_is_admin THEN
      RAISE EXCEPTION 'Only the resource custodian or institution admin can decide bookings';
    END IF;

    IF v_current_user = OLD.borrower_id THEN
      RAISE EXCEPTION 'Borrowers cannot approve their own booking requests';
    END IF;

    IF OLD.status NOT IN ('requested', 'waitlisted') THEN
      RAISE EXCEPTION 'Cannot transition booking from "%" to "%"', OLD.status, NEW.status;
    END IF;

    IF NEW.status = 'approved' THEN
      SELECT count(*) INTO v_unresolved_checks
      FROM public.eligibility_checks
      WHERE booking_id = OLD.id AND status IN ('pending', 'failed');

      IF v_unresolved_checks > 0 THEN
        RAISE EXCEPTION 'Cannot approve booking: % eligibility check(s) unresolved or failed', v_unresolved_checks;
      END IF;
    END IF;

    NEW.decision_by := COALESCE(v_current_user, NEW.decision_by);
    NEW.decision_at := timezone('utc'::text, now());
    RETURN NEW;
  END IF;

  -- 3. Checkout: approved -> checked_out
  IF NEW.status = 'checked_out' THEN
    IF OLD.status != 'approved' THEN
      RAISE EXCEPTION 'Cannot check out booking in status "%". Must be approved first.', OLD.status;
    END IF;

    IF v_current_user != OLD.borrower_id AND v_current_user != v_resource_owner AND NOT v_is_admin THEN
      RAISE EXCEPTION 'Unauthorized to perform equipment checkout';
    END IF;

    RETURN NEW;
  END IF;

  -- 4. Return: checked_out -> returned
  IF NEW.status = 'returned' THEN
    IF OLD.status != 'checked_out' THEN
      RAISE EXCEPTION 'Cannot return booking in status "%". Must be checked out first.', OLD.status;
    END IF;

    IF v_current_user != OLD.borrower_id AND v_current_user != v_resource_owner AND NOT v_is_admin THEN
      RAISE EXCEPTION 'Unauthorized to record equipment return';
    END IF;

    RETURN NEW;
  END IF;

  -- 5. Completion: returned -> completed (Only custodian / admin; self-approval prohibited)
  IF NEW.status = 'completed' THEN
    IF OLD.status != 'returned' THEN
      RAISE EXCEPTION 'Cannot complete booking in status "%". Must be returned first.', OLD.status;
    END IF;

    IF v_current_user IS NOT NULL AND v_current_user != v_resource_owner AND NOT v_is_admin THEN
      RAISE EXCEPTION 'Only the resource custodian or manager can complete return inspection';
    END IF;

    IF v_current_user = OLD.borrower_id THEN
      RAISE EXCEPTION 'Borrowers cannot approve their own return inspection';
    END IF;

    -- Block completion if critical unresolved incidents exist
    SELECT count(*) INTO v_open_incidents
    FROM public.incidents
    WHERE booking_id = OLD.id AND status = 'open' AND severity IN ('high', 'critical');

    IF v_open_incidents > 0 THEN
      RAISE EXCEPTION 'Cannot close booking: % unresolved high/critical incident(s) pending', v_open_incidents;
    END IF;

    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Illegal status transition from "%" to "%"', OLD.status, NEW.status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
