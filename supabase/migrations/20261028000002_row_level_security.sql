-- ==============================================================================
-- Migration: 20261028000002_row_level_security.sql
-- Description: Row Level Security (RLS) policies and authorization functions
-- Platform: Supabase PostgreSQL (TechCircuit Hackathon)
-- ==============================================================================

-- 1. SECURITY HELPER FUNCTIONS (SECURITY DEFINER with strict search_path)

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

-- 2. ENABLE ROW LEVEL SECURITY ON ALL TABLES

ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE eligibility_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE condition_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- 3. POLICIES: INSTITUTIONS
-- Public read for catalog discovery; admin-only management
CREATE POLICY "Institutions are readable by everyone"
  ON institutions FOR SELECT
  USING (true);

CREATE POLICY "Institutions can be created by administrators"
  ON institutions FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Institutions can be updated by administrators"
  ON institutions FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Institutions can be deleted by administrators"
  ON institutions FOR DELETE
  USING (public.is_admin(auth.uid()));

-- 4. POLICIES: PROFILES
-- Authenticated users can view member profiles for trust verification
CREATE POLICY "Profiles are readable by authenticated users"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Self-update allowed for permitted fields (enforced by trigger prevent_self_privilege_escalation)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = id OR public.is_admin(auth.uid()));

-- 5. POLICIES: RESOURCES
-- Anyone (including anonymous) can discover published resources
CREATE POLICY "Published resources are discoverable by all"
  ON resources FOR SELECT
  USING (
    status = 'published'
    OR owner_id = auth.uid()
    OR public.is_admin(auth.uid())
  );

-- Only authenticated users can list resources under their own profile ID
CREATE POLICY "Authenticated users can create resources"
  ON resources FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = owner_id
  );

-- Only owners or institution admins can update their resources
CREATE POLICY "Resource owners or admins can update resources"
  ON resources FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (owner_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Resource owners or admins can delete resources"
  ON resources FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin(auth.uid()));

-- 6. POLICIES: RESOURCE AVAILABILITY
CREATE POLICY "Availability viewable if resource viewable"
  ON resource_availability FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM resources r
      WHERE r.id = resource_availability.resource_id
        AND (r.status = 'published' OR r.owner_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

CREATE POLICY "Resource owners can manage availability"
  ON resource_availability FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM resources r
      WHERE r.id = resource_availability.resource_id
        AND (r.owner_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM resources r
      WHERE r.id = resource_availability.resource_id
        AND (r.owner_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- 7. POLICIES: BOOKINGS
-- Borrowers, owners, and admins can read booking records
CREATE POLICY "Participants can view their bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    borrower_id = auth.uid()
    OR public.is_resource_owner(resource_id, auth.uid())
    OR public.is_admin(auth.uid())
  );

-- Borrowers can create booking requests for published resources
CREATE POLICY "Borrowers can create booking requests"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = borrower_id
    AND EXISTS (
      SELECT 1 FROM resources r
      WHERE r.id = resource_id AND r.status = 'published'
    )
  );

-- Borrowers can cancel pending requests; Owners/Admins can review and approve
CREATE POLICY "Participants can update authorized booking fields"
  ON bookings FOR UPDATE
  TO authenticated
  USING (
    borrower_id = auth.uid()
    OR public.is_resource_owner(resource_id, auth.uid())
    OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    borrower_id = auth.uid()
    OR public.is_resource_owner(resource_id, auth.uid())
    OR public.is_admin(auth.uid())
  );

-- 8. POLICIES: ELIGIBILITY CHECKS
CREATE POLICY "Eligibility checks viewable by booking participants"
  ON eligibility_checks FOR SELECT
  TO authenticated
  USING (public.is_booking_participant(booking_id, auth.uid()));

CREATE POLICY "Resource owners or admins can manage eligibility checks"
  ON eligibility_checks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      WHERE b.id = eligibility_checks.booking_id
        AND (r.owner_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      WHERE b.id = eligibility_checks.booking_id
        AND (r.owner_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- 9. POLICIES: CONDITION REPORTS
CREATE POLICY "Condition reports viewable by booking participants"
  ON condition_reports FOR SELECT
  TO authenticated
  USING (public.is_booking_participant(booking_id, auth.uid()));

CREATE POLICY "Participants can submit condition reports"
  ON condition_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = reporter_id
    AND public.is_booking_participant(booking_id, auth.uid())
  );

-- 10. POLICIES: INCIDENTS
CREATE POLICY "Incidents viewable by participants and admins"
  ON incidents FOR SELECT
  TO authenticated
  USING (
    reporter_id = auth.uid()
    OR public.is_booking_participant(booking_id, auth.uid())
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Participants can file incidents"
  ON incidents FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = reporter_id
    AND public.is_booking_participant(booking_id, auth.uid())
  );

CREATE POLICY "Resource owners and admins can resolve incidents"
  ON incidents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      WHERE b.id = incidents.booking_id
        AND (r.owner_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      WHERE b.id = incidents.booking_id
        AND (r.owner_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- 11. POLICIES: ACTIVITY LOGS
-- Immutable audit ledger: Users and participants can only SELECT relevant logs.
-- Direct client INSERT, UPDATE, or DELETE is strictly forbidden.
CREATE POLICY "Activity logs viewable by relevant actors or admins"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (
    actor_id = auth.uid()
    OR (booking_id IS NOT NULL AND public.is_booking_participant(booking_id, auth.uid()))
    OR (resource_id IS NOT NULL AND public.is_resource_owner(resource_id, auth.uid()))
    OR public.is_admin(auth.uid())
  );
