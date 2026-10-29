-- ==============================================================================
-- NEXUS COMPLETE DATABASE SCHEMA & POLICIES (RUN THIS IN SUPABASE SQL EDITOR)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 2. ENUM TYPES
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('member', 'resource_owner', 'institution_admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE resource_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM (
    'requested',
    'approved',
    'rejected',
    'waitlisted',
    'checked_out',
    'returned',
    'completed',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE condition_stage AS ENUM ('checkout', 'return');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE incident_severity AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE incident_status AS ENUM ('open', 'under_review', 'resolved', 'dismissed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE eligibility_check_status AS ENUM ('pending', 'passed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. CORE TABLES

-- 3.1 Institutions
CREATE TABLE IF NOT EXISTS public.institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  domain TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.2 Profiles (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
  role user_role NOT NULL DEFAULT 'member',
  verification_status verification_status NOT NULL DEFAULT 'unverified',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.3 Resources
CREATE TABLE IF NOT EXISTS public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  location TEXT,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  eligibility_requirements TEXT,
  usage_rules TEXT,
  deposit_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  status resource_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT non_negative_deposit CHECK (deposit_amount >= 0)
);

-- 3.4 Resource Availability Windows
CREATE TABLE IF NOT EXISTS public.resource_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT valid_availability_window CHECK (start_time < end_time)
);

-- 3.5 Bookings
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  borrower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status booking_status NOT NULL DEFAULT 'requested',
  request_notes TEXT,
  decision_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  decision_at TIMESTAMPTZ,
  decision_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT booking_time_order CHECK (start_time < end_time),
  CONSTRAINT prevent_overlapping_active_bookings EXCLUDE USING gist (
    resource_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  ) WHERE (status IN ('approved', 'checked_out'))
);

-- 3.6 Eligibility Checks
CREATE TABLE IF NOT EXISTS public.eligibility_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  requirement TEXT NOT NULL,
  status eligibility_check_status NOT NULL DEFAULT 'pending',
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.7 Condition Reports
CREATE TABLE IF NOT EXISTS public.condition_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  stage condition_stage NOT NULL,
  notes TEXT NOT NULL,
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.8 Incidents
CREATE TABLE IF NOT EXISTS public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  incident_type TEXT NOT NULL,
  description TEXT NOT NULL,
  severity incident_severity NOT NULL DEFAULT 'medium',
  status incident_status NOT NULL DEFAULT 'open',
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.9 Activity Logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resource_id UUID REFERENCES public.resources(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_profiles_institution_id ON public.profiles(institution_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_resources_owner_id ON public.resources(owner_id);
CREATE INDEX IF NOT EXISTS idx_resources_institution_id ON public.resources(institution_id);
CREATE INDEX IF NOT EXISTS idx_resources_status ON public.resources(status);
CREATE INDEX IF NOT EXISTS idx_resources_category ON public.resources(category);
CREATE INDEX IF NOT EXISTS idx_bookings_resource_id ON public.bookings(resource_id);
CREATE INDEX IF NOT EXISTS idx_bookings_borrower_id ON public.bookings(borrower_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_time_range ON public.bookings USING gist (tstzrange(start_time, end_time));
CREATE INDEX IF NOT EXISTS idx_eligibility_booking_id ON public.eligibility_checks(booking_id);
CREATE INDEX IF NOT EXISTS idx_condition_reports_booking_id ON public.condition_reports(booking_id);
CREATE INDEX IF NOT EXISTS idx_incidents_booking_id ON public.incidents(booking_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_id ON public.activity_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_booking_id ON public.activity_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- 5. PROCEDURES & TRIGGERS

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_institutions_updated_at ON public.institutions;
CREATE TRIGGER update_institutions_updated_at
  BEFORE UPDATE ON public.institutions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_resources_updated_at ON public.resources;
CREATE TRIGGER update_resources_updated_at
  BEFORE UPDATE ON public.resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_eligibility_checks_updated_at ON public.eligibility_checks;
CREATE TRIGGER update_eligibility_checks_updated_at
  BEFORE UPDATE ON public.eligibility_checks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_incidents_updated_at ON public.incidents;
CREATE TRIGGER update_incidents_updated_at
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto profile creation on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    avatar_url,
    role,
    verification_status
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'avatar_url',
    'member',
    'unverified'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Prevent self-role / verification escalation
CREATE OR REPLACE FUNCTION public.prevent_self_privilege_escalation()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  current_user_role user_role;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role INTO current_user_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF (OLD.role IS DISTINCT FROM NEW.role OR OLD.verification_status IS DISTINCT FROM NEW.verification_status) THEN
    IF current_user_role IS DISTINCT FROM 'institution_admin' THEN
      RAISE EXCEPTION 'Access Denied: Role and verification statuses can only be modified by authorized administrators.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_profile_security ON public.profiles;
CREATE TRIGGER enforce_profile_security
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_privilege_escalation();

-- Automatic Activity Log Trigger
CREATE OR REPLACE FUNCTION public.log_booking_lifecycle_event()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.activity_logs (
      actor_id,
      resource_id,
      booking_id,
      action_type,
      details
    ) VALUES (
      NEW.borrower_id,
      NEW.resource_id,
      NEW.id,
      'booking_requested',
      jsonb_build_object(
        'start_time', NEW.start_time,
        'end_time', NEW.end_time,
        'request_notes', NEW.request_notes
      )
    );
  ELSIF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.activity_logs (
      actor_id,
      resource_id,
      booking_id,
      action_type,
      details
    ) VALUES (
      COALESCE(NEW.decision_by, auth.uid(), NEW.borrower_id),
      NEW.resource_id,
      NEW.id,
      concat('booking_', NEW.status),
      jsonb_build_object(
        'previous_status', OLD.status,
        'new_status', NEW.status,
        'decision_notes', NEW.decision_notes
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_booking_activity_event ON public.bookings;
CREATE TRIGGER on_booking_activity_event
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.log_booking_lifecycle_event();

-- 6. SECURITY HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = check_user_id AND role = 'institution_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_resource_owner(check_resource_id UUID, check_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.resources
    WHERE id = check_resource_id AND owner_id = check_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_booking_participant(check_booking_id UUID, check_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.resources r ON r.id = b.resource_id
    WHERE b.id = check_booking_id
      AND (b.borrower_id = check_user_id OR r.owner_id = check_user_id OR public.is_admin(check_user_id))
  );
$$;

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eligibility_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condition_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Institutions policies
DROP POLICY IF EXISTS "Institutions are readable by everyone" ON public.institutions;
CREATE POLICY "Institutions are readable by everyone" ON public.institutions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Institutions can be created by administrators" ON public.institutions;
CREATE POLICY "Institutions can be created by administrators" ON public.institutions FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Institutions can be updated by administrators" ON public.institutions;
CREATE POLICY "Institutions can be updated by administrators" ON public.institutions FOR UPDATE USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Profiles policies
DROP POLICY IF EXISTS "Profiles are readable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are readable by authenticated users" ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR public.is_admin(auth.uid())) WITH CHECK (auth.uid() = id OR public.is_admin(auth.uid()));

-- Resources policies
DROP POLICY IF EXISTS "Published resources are discoverable by all" ON public.resources;
CREATE POLICY "Published resources are discoverable by all" ON public.resources FOR SELECT USING (status = 'published' OR owner_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can create resources" ON public.resources;
CREATE POLICY "Authenticated users can create resources" ON public.resources FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Resource owners or admins can update resources" ON public.resources;
CREATE POLICY "Resource owners or admins can update resources" ON public.resources FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.is_admin(auth.uid())) WITH CHECK (owner_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Resource owners or admins can delete resources" ON public.resources;
CREATE POLICY "Resource owners or admins can delete resources" ON public.resources FOR DELETE TO authenticated USING (owner_id = auth.uid() OR public.is_admin(auth.uid()));

-- Bookings policies
DROP POLICY IF EXISTS "Participants can view their bookings" ON public.bookings;
CREATE POLICY "Participants can view their bookings" ON public.bookings FOR SELECT TO authenticated USING (borrower_id = auth.uid() OR public.is_resource_owner(resource_id, auth.uid()) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Borrowers can create booking requests" ON public.bookings;
CREATE POLICY "Borrowers can create booking requests" ON public.bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = borrower_id AND EXISTS (SELECT 1 FROM public.resources r WHERE r.id = resource_id AND r.status = 'published'));

DROP POLICY IF EXISTS "Participants can update authorized booking fields" ON public.bookings;
CREATE POLICY "Participants can update authorized booking fields" ON public.bookings FOR UPDATE TO authenticated USING (borrower_id = auth.uid() OR public.is_resource_owner(resource_id, auth.uid()) OR public.is_admin(auth.uid())) WITH CHECK (borrower_id = auth.uid() OR public.is_resource_owner(resource_id, auth.uid()) OR public.is_admin(auth.uid()));

-- Eligibility, Condition, Incidents, and Activity Logs
DROP POLICY IF EXISTS "Eligibility checks viewable by booking participants" ON public.eligibility_checks;
CREATE POLICY "Eligibility checks viewable by booking participants" ON public.eligibility_checks FOR SELECT TO authenticated USING (public.is_booking_participant(booking_id, auth.uid()));

DROP POLICY IF EXISTS "Condition reports viewable by booking participants" ON public.condition_reports;
CREATE POLICY "Condition reports viewable by booking participants" ON public.condition_reports FOR SELECT TO authenticated USING (public.is_booking_participant(booking_id, auth.uid()));

DROP POLICY IF EXISTS "Participants can submit condition reports" ON public.condition_reports;
CREATE POLICY "Participants can submit condition reports" ON public.condition_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id AND public.is_booking_participant(booking_id, auth.uid()));

DROP POLICY IF EXISTS "Incidents viewable by participants and admins" ON public.incidents;
CREATE POLICY "Incidents viewable by participants and admins" ON public.incidents FOR SELECT TO authenticated USING (reporter_id = auth.uid() OR public.is_booking_participant(booking_id, auth.uid()) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Participants can file incidents" ON public.incidents;
CREATE POLICY "Participants can file incidents" ON public.incidents FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id AND public.is_booking_participant(booking_id, auth.uid()));

DROP POLICY IF EXISTS "Activity logs viewable by relevant actors or admins" ON public.activity_logs;
CREATE POLICY "Activity logs viewable by relevant actors or admins" ON public.activity_logs FOR SELECT TO authenticated USING (actor_id = auth.uid() OR (booking_id IS NOT NULL AND public.is_booking_participant(booking_id, auth.uid())) OR (resource_id IS NOT NULL AND public.is_resource_owner(resource_id, auth.uid())) OR public.is_admin(auth.uid()));

-- 8. BASELINE SEED DATA
INSERT INTO public.institutions (id, name, description, location, domain)
VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    'TechCircuit Institute of Technology',
    'Flagship research university hosting central fabrication and computing clusters.',
    'Building 4, Science Park, Innovation Hub',
    'techcircuit.edu'
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    'Metropolitan Bioengineering Laboratory',
    'Advanced biosafety level 2 wet labs, spectrometry, and imaging equipment.',
    'West Campus, Life Sciences Center',
    'metrobio.org'
  ),
  (
    'a0000000-0000-0000-0000-000000000003',
    'Apex Community Makerspace & Prototyping Center',
    'Rapid fabrication facility with CNC mills, 5-axis routers, and electronics testbenches.',
    'Downtown Arts & Engineering District',
    'apexmakers.org'
  )
ON CONFLICT (id) DO NOTHING;

-- 9. RESOURCE TYPE & STORAGE (Migration 4)
DO $$ BEGIN
  ALTER TABLE public.resources
    ADD COLUMN IF NOT EXISTS resource_type TEXT NOT NULL DEFAULT 'equipment'
    CHECK (resource_type IN ('equipment', 'laboratory', 'workspace', 'meeting_room', 'classroom', 'other'));
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_resources_resource_type ON public.resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_resources_search ON public.resources
USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Storage bucket configuration
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resource-images',
  'resource-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

DROP POLICY IF EXISTS "Public can view resource images" ON storage.objects;
CREATE POLICY "Public can view resource images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'resource-images');

DROP POLICY IF EXISTS "Authenticated users can upload resource images" ON storage.objects;
CREATE POLICY "Authenticated users can upload resource images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'resource-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 10. BOOKING ENGINE & ELIGIBILITY ENFORCEMENT (Migration 5)
CREATE INDEX IF NOT EXISTS idx_bookings_waitlist
  ON public.bookings (resource_id, created_at ASC)
  WHERE status = 'waitlisted';

CREATE INDEX IF NOT EXISTS idx_bookings_active_slots
  ON public.bookings (resource_id, start_time, end_time)
  WHERE status IN ('approved', 'checked_out');

-- Invariant: Custodians cannot book their own resources
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

-- Invariant: Status transitions & eligibility enforcement
CREATE OR REPLACE FUNCTION public.validate_booking_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  v_unresolved_checks INT;
  v_resource_owner UUID;
  v_is_admin BOOLEAN;
  v_current_user UUID;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  v_current_user := auth.uid();
  SELECT owner_id INTO v_resource_owner FROM public.resources WHERE id = OLD.resource_id;
  v_is_admin := public.is_admin(v_current_user);

  IF OLD.status IN ('rejected', 'cancelled', 'completed') THEN
    RAISE EXCEPTION 'Cannot modify booking in terminal status "%"', OLD.status;
  END IF;

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

-- Automated audit logging for bookings
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

-- Automated initialization of eligibility checks
CREATE OR REPLACE FUNCTION public.initialize_booking_eligibility()
RETURNS TRIGGER AS $$
DECLARE
  v_borrower_verif verification_status;
  v_resource_reqs TEXT;
BEGIN
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

-- 11. CHECKOUT, RETURN, CONDITION INSPECTIONS & INCIDENTS (Migration 6)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'condition-photos',
  'condition-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

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

DO $$ BEGIN
  ALTER TABLE public.incidents
    ADD COLUMN IF NOT EXISTS resource_id UUID REFERENCES public.resources(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS photos JSONB NOT NULL DEFAULT '[]'::jsonb;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_resource ON public.incidents(resource_id);

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

-- 12. INSTITUTIONAL ADMINISTRATION, NOTIFICATIONS & AUDIT ENHANCEMENTS (Migration 7)
DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
    ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS verification_notes TEXT,
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_institution_status
  ON public.profiles(institution_id, verification_status, is_suspended);

DO $$ BEGIN
  ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS resource_id UUID REFERENCES public.resources(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS incident_id UUID REFERENCES public.incidents(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS link TEXT,
    ADD COLUMN IF NOT EXISTS dedup_key TEXT;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedup
  ON public.notifications(user_id, dedup_key)
  WHERE dedup_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_category
  ON public.notifications(user_id, category, is_read);

CREATE OR REPLACE FUNCTION public.is_institution_admin(check_user_id UUID, check_institution_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = check_user_id
      AND role = 'institution_admin'
      AND (
        institution_id = check_institution_id
        OR institution_id IS NULL
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.prevent_self_privilege_escalation()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  v_caller_role user_role;
  v_caller_inst UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role, institution_id INTO v_caller_role, v_caller_inst
  FROM public.profiles
  WHERE id = auth.uid();

  IF (
    OLD.role IS DISTINCT FROM NEW.role OR
    OLD.verification_status IS DISTINCT FROM NEW.verification_status OR
    OLD.is_suspended IS DISTINCT FROM NEW.is_suspended
  ) THEN
    IF v_caller_role IS DISTINCT FROM 'institution_admin' THEN
      RAISE EXCEPTION 'Access Denied: Only institutional administrators can modify user roles, verification, or access restrictions.';
    END IF;

    IF auth.uid() = NEW.id AND (OLD.role IS DISTINCT FROM NEW.role OR OLD.is_suspended IS DISTINCT FROM NEW.is_suspended) THEN
      RAISE EXCEPTION 'Security Invariant: Administrators cannot alter their own institutional role or suspension status.';
    END IF;

    IF v_caller_inst IS NOT NULL AND OLD.institution_id IS NOT NULL AND v_caller_inst IS DISTINCT FROM OLD.institution_id THEN
      RAISE EXCEPTION 'Access Denied: Institutional administrators cannot manage members of other institutions.';
    END IF;

    IF OLD.role IS DISTINCT FROM NEW.role THEN
      INSERT INTO public.activity_logs (actor_id, action_type, details)
      VALUES (
        auth.uid(),
        'member_role_changed',
        jsonb_build_object(
          'target_user_id', NEW.id,
          'old_role', OLD.role,
          'new_role', NEW.role,
          'institution_id', NEW.institution_id
        )
      );
    END IF;

    IF OLD.verification_status IS DISTINCT FROM NEW.verification_status THEN
      INSERT INTO public.activity_logs (actor_id, action_type, details)
      VALUES (
        auth.uid(),
        'member_verification_changed',
        jsonb_build_object(
          'target_user_id', NEW.id,
          'old_status', OLD.verification_status,
          'new_status', NEW.verification_status,
          'notes', NEW.verification_notes,
          'institution_id', NEW.institution_id
        )
      );
    END IF;

    IF OLD.is_suspended IS DISTINCT FROM NEW.is_suspended THEN
      INSERT INTO public.activity_logs (actor_id, action_type, details)
      VALUES (
        auth.uid(),
        CASE WHEN NEW.is_suspended THEN 'member_suspended' ELSE 'member_reinstated' END,
        jsonb_build_object(
          'target_user_id', NEW.id,
          'reason', NEW.suspension_reason,
          'institution_id', NEW.institution_id
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "Activity logs viewable by relevant actors or admins" ON public.activity_logs;
CREATE POLICY "Activity logs viewable by relevant actors or admins"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (
    actor_id = auth.uid()
    OR (booking_id IS NOT NULL AND public.is_booking_participant(booking_id, auth.uid()))
    OR (resource_id IS NOT NULL AND public.is_resource_owner(resource_id, auth.uid()))
    OR public.is_admin(auth.uid())
    OR (
      resource_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.resources r
        WHERE r.id = activity_logs.resource_id
          AND public.is_institution_admin(auth.uid(), r.institution_id)
      )
    )
    OR (
      booking_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.bookings b
        JOIN public.resources r ON r.id = b.resource_id
        WHERE b.id = activity_logs.booking_id
          AND public.is_institution_admin(auth.uid(), r.institution_id)
      )
    )
  );

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id
    OR public.is_admin(auth.uid())
    OR (institution_id IS NOT NULL AND public.is_institution_admin(auth.uid(), institution_id))
  )
  WITH CHECK (
    auth.uid() = id
    OR public.is_admin(auth.uid())
    OR (institution_id IS NOT NULL AND public.is_institution_admin(auth.uid(), institution_id))
  );

DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

