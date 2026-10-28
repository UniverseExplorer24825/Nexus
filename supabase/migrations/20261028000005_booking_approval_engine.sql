-- ==============================================================================
-- Migration: 20261028000005_booking_approval_engine.sql
-- Description: Automated status transitions, eligibility verification, audit logging,
--              concurrency controls, and waitlist management for Nexus bookings.
-- Platform: Supabase PostgreSQL (TechCircuit Hackathon)
-- ==============================================================================

-- 1. WAITLIST & CONFLICT PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_bookings_waitlist
  ON public.bookings (resource_id, created_at ASC)
  WHERE status = 'waitlisted';

CREATE INDEX IF NOT EXISTS idx_bookings_active_slots
  ON public.bookings (resource_id, start_time, end_time)
  WHERE status IN ('approved', 'checked_out');

-- 2. INVARIANT TRIGGER: CUSTODIANS CANNOT BOOK THEIR OWN RESOURCES
CREATE OR REPLACE FUNCTION public.check_booking_borrower_not_owner()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id UUID;
  v_resource_status resource_status;
BEGIN
  SELECT owner_id, status INTO v_owner_id, v_resource_status
  FROM public.resources
  WHERE id = NEW.resource_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target resource does not exist';
  END IF;

  IF v_resource_status != 'published' THEN
    RAISE EXCEPTION 'Resource is not published and cannot be booked';
  END IF;

  IF v_owner_id = NEW.borrower_id THEN
    RAISE EXCEPTION 'Resource custodians cannot book their own resources';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_check_booking_not_owner ON public.bookings;
CREATE TRIGGER trg_check_booking_not_owner
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.check_booking_borrower_not_owner();

-- 3. INVARIANT TRIGGER: STATUS TRANSITIONS & ELIGIBILITY ENFORCEMENT
CREATE OR REPLACE FUNCTION public.validate_booking_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  v_unresolved_checks INT;
  v_resource_owner UUID;
  v_is_admin BOOLEAN;
  v_current_user UUID;
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

  -- Cancellation transition
  IF NEW.status = 'cancelled' THEN
    -- Borrowers can cancel their own bookings; owners/admins can also cancel
    IF v_current_user != OLD.borrower_id AND v_current_user != v_resource_owner AND NOT v_is_admin THEN
      RAISE EXCEPTION 'Unauthorized to cancel this booking';
    END IF;

    IF OLD.status NOT IN ('requested', 'waitlisted', 'approved') THEN
      RAISE EXCEPTION 'Cannot cancel booking in status "%"', OLD.status;
    END IF;

    NEW.decision_at := timezone('utc'::text, now());
    RETURN NEW;
  END IF;

  -- Decisions (approved, rejected, waitlisted) require resource owner or admin authorization
  IF NEW.status IN ('approved', 'rejected', 'waitlisted') THEN
    -- Must be custodian or admin
    IF v_current_user IS NOT NULL AND v_current_user != v_resource_owner AND NOT v_is_admin THEN
      RAISE EXCEPTION 'Only the resource custodian or institution admin can decide bookings';
    END IF;

    -- Custodian cannot approve if they are somehow the borrower
    IF v_current_user = OLD.borrower_id THEN
      RAISE EXCEPTION 'Borrowers cannot approve their own booking requests';
    END IF;

    -- Valid prior statuses
    IF OLD.status NOT IN ('requested', 'waitlisted') THEN
      RAISE EXCEPTION 'Cannot transition booking from "%" to "%"', OLD.status, NEW.status;
    END IF;

    -- When approving, check eligibility requirements
    IF NEW.status = 'approved' THEN
      SELECT count(*) INTO v_unresolved_checks
      FROM public.eligibility_checks
      WHERE booking_id = OLD.id
        AND status IN ('pending', 'failed');

      IF v_unresolved_checks > 0 THEN
        RAISE EXCEPTION 'Cannot approve booking: % eligibility check(s) unresolved or failed', v_unresolved_checks;
      END IF;
    END IF;

    NEW.decision_by := COALESCE(v_current_user, NEW.decision_by);
    NEW.decision_at := timezone('utc'::text, now());
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_booking_transition ON public.bookings;
CREATE TRIGGER trg_validate_booking_transition
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_booking_status_transition();

-- 4. AUTOMATED AUDIT LOGGING FOR BOOKINGS
CREATE OR REPLACE FUNCTION public.log_booking_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_actor UUID;
BEGIN
  v_actor := auth.uid();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_logs (actor_id, resource_id, booking_id, action_type, details)
    VALUES (
      NEW.borrower_id,
      NEW.resource_id,
      NEW.id,
      'booking_requested',
      jsonb_build_object(
        'start_time', NEW.start_time,
        'end_time', NEW.end_time,
        'notes', NEW.request_notes
      )
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO public.activity_logs (actor_id, resource_id, booking_id, action_type, details)
    VALUES (
      COALESCE(v_actor, NEW.decision_by, NEW.borrower_id),
      NEW.resource_id,
      NEW.id,
      'booking_' || NEW.status,
      jsonb_build_object(
        'previous_status', OLD.status,
        'new_status', NEW.status,
        'decision_notes', NEW.decision_notes,
        'decision_at', NEW.decision_at
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_log_booking_activity ON public.bookings;
CREATE TRIGGER trg_log_booking_activity
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.log_booking_activity();

-- 5. AUTOMATED INITIALIZATION OF ELIGIBILITY CHECKS
CREATE OR REPLACE FUNCTION public.initialize_booking_eligibility()
RETURNS TRIGGER AS $$
DECLARE
  v_borrower_verif verification_status;
  v_resource_reqs TEXT;
BEGIN
  -- 1. Institutional Membership Verification
  SELECT verification_status INTO v_borrower_verif
  FROM public.profiles
  WHERE id = NEW.borrower_id;

  IF v_borrower_verif = 'verified' THEN
    INSERT INTO public.eligibility_checks (booking_id, requirement, status, review_notes, reviewed_at)
    VALUES (
      NEW.id,
      'Institutional Membership Verification',
      'passed',
      'Auto-verified via verified institutional credentials',
      timezone('utc'::text, now())
    );
  ELSE
    INSERT INTO public.eligibility_checks (booking_id, requirement, status, review_notes)
    VALUES (
      NEW.id,
      'Institutional Membership Verification',
      'pending',
      'Institutional credential review required'
    );
  END IF;

  -- 2. Resource-Specific Eligibility Requirements
  SELECT eligibility_requirements INTO v_resource_reqs
  FROM public.resources
  WHERE id = NEW.resource_id;

  IF v_resource_reqs IS NOT NULL AND trim(v_resource_reqs) != '' THEN
    INSERT INTO public.eligibility_checks (booking_id, requirement, status, review_notes)
    VALUES (
      NEW.id,
      'Prerequisite Training & Clearances: ' || substr(v_resource_reqs, 1, 100),
      'pending',
      'Custodian verification of specific apparatus prerequisites'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_init_booking_eligibility ON public.bookings;
CREATE TRIGGER trg_init_booking_eligibility
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_booking_eligibility();
