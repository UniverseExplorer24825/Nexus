-- ==============================================================================
-- Migration: 20261028000001_initial_schema.sql
-- Description: Core database schema, constraints, triggers, and audit logging for Nexus
-- Platform: Supabase PostgreSQL (TechCircuit Hackathon)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 2. ENUM TYPES
CREATE TYPE user_role AS ENUM ('member', 'resource_owner', 'institution_admin');
CREATE TYPE verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');
CREATE TYPE resource_status AS ENUM ('draft', 'published', 'archived');
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
CREATE TYPE condition_stage AS ENUM ('checkout', 'return');
CREATE TYPE incident_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE incident_status AS ENUM ('open', 'under_review', 'resolved', 'dismissed');
CREATE TYPE eligibility_check_status AS ENUM ('pending', 'passed', 'failed');

-- 3. CORE ENTITIES

-- 3.1 Institutions
CREATE TABLE institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  domain TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.2 Profiles (Linked to auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL,
  role user_role NOT NULL DEFAULT 'member',
  verification_status verification_status NOT NULL DEFAULT 'unverified',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.3 Resources
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL,
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

-- 3.4 Resource Availability Windows (Multiple schedules)
CREATE TABLE resource_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT valid_availability_window CHECK (start_time < end_time)
);

-- 3.5 Bookings
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  borrower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status booking_status NOT NULL DEFAULT 'requested',
  request_notes TEXT,
  decision_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  decision_at TIMESTAMPTZ,
  decision_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT booking_time_order CHECK (start_time < end_time),
  -- Database exclusion constraint preventing overlapping active reservations (approved or checked_out)
  CONSTRAINT prevent_overlapping_active_bookings EXCLUDE USING gist (
    resource_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  ) WHERE (status IN ('approved', 'checked_out'))
);

-- 3.6 Eligibility Checks
CREATE TABLE eligibility_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  requirement TEXT NOT NULL,
  status eligibility_check_status NOT NULL DEFAULT 'pending',
  reviewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.7 Condition Reports
CREATE TABLE condition_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  stage condition_stage NOT NULL,
  notes TEXT NOT NULL,
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.8 Incidents
CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  incident_type TEXT NOT NULL,
  description TEXT NOT NULL,
  severity incident_severity NOT NULL DEFAULT 'medium',
  status incident_status NOT NULL DEFAULT 'open',
  reviewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.9 Activity Logs (Protected, immutable audit trail)
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. PERFORMANCE & CONFLICT INDEXES
CREATE INDEX idx_profiles_institution_id ON profiles(institution_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_resources_owner_id ON resources(owner_id);
CREATE INDEX idx_resources_institution_id ON resources(institution_id);
CREATE INDEX idx_resources_status ON resources(status);
CREATE INDEX idx_resources_category ON resources(category);
CREATE INDEX idx_bookings_resource_id ON bookings(resource_id);
CREATE INDEX idx_bookings_borrower_id ON bookings(borrower_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_time_range ON bookings USING gist (tstzrange(start_time, end_time));
CREATE INDEX idx_eligibility_booking_id ON eligibility_checks(booking_id);
CREATE INDEX idx_condition_reports_booking_id ON condition_reports(booking_id);
CREATE INDEX idx_incidents_booking_id ON incidents(booking_id);
CREATE INDEX idx_activity_logs_resource_id ON activity_logs(resource_id);
CREATE INDEX idx_activity_logs_booking_id ON activity_logs(booking_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- 5. AUTOMATED TRIGGERS & PROCEDURES

-- 5.1 Updated At Automation
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_institutions_updated_at
  BEFORE UPDATE ON institutions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resources_updated_at
  BEFORE UPDATE ON resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_eligibility_checks_updated_at
  BEFORE UPDATE ON eligibility_checks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at
  BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5.2 Automatic Profile Creation on User Sign-Up
-- Securely extracts user metadata without allowing privilege escalation
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
    'member',          -- Always default to unprivileged member
    'unverified'       -- Always default to unverified
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5.3 Enforce Immutability of Role and Verification Status by Non-Admins
CREATE OR REPLACE FUNCTION public.prevent_self_privilege_escalation()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  current_user_role user_role;
BEGIN
  -- If invoked by service_role or database triggers (auth.uid() IS NULL), allow
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Query existing role of the executing user
  SELECT role INTO current_user_role
  FROM public.profiles
  WHERE id = auth.uid();

  -- If non-admin attempts to change role or verification status, reject immediately
  IF (OLD.role IS DISTINCT FROM NEW.role OR OLD.verification_status IS DISTINCT FROM NEW.verification_status) THEN
    IF current_user_role IS DISTINCT FROM 'institution_admin' THEN
      RAISE EXCEPTION 'Access Denied: Role and verification statuses can only be modified by authorized institutional administrators.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_profile_security
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_privilege_escalation();

-- 5.4 Automatic Activity Log on Booking Lifecycle Events
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

CREATE TRIGGER on_booking_activity_event
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.log_booking_lifecycle_event();
