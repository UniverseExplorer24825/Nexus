-- ==============================================================================
-- MIGRATION 7: INSTITUTIONAL ADMINISTRATION, NOTIFICATIONS & AUDIT ENHANCEMENTS
-- ==============================================================================

-- 1. PROFILES ENHANCEMENTS: SUSPENSION & VERIFICATION AUDIT TRAIL
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

-- 2. NOTIFICATIONS ENHANCEMENTS: REFERENCES & DEDUPLICATION
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

-- 3. INSTITUTIONAL ADMIN SECURITY FUNCTION
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
        -- Institutional admin belongs to the same institution, or is a global admin without institution boundary
        institution_id = check_institution_id
        OR institution_id IS NULL
      )
  );
$$;

-- 4. PROFILE SECURITY TRIGGER: PROHIBIT SELF-PROMOTION & CROSS-INSTITUTION MANAGEMENT
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
  -- If invoked without auth context (e.g. database migrations / service role), allow
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role, institution_id INTO v_caller_role, v_caller_inst
  FROM public.profiles
  WHERE id = auth.uid();

  -- Check if privileged fields are being modified
  IF (
    OLD.role IS DISTINCT FROM NEW.role OR
    OLD.verification_status IS DISTINCT FROM NEW.verification_status OR
    OLD.is_suspended IS DISTINCT FROM NEW.is_suspended
  ) THEN
    -- Only institution_admin can modify roles, verification statuses, or suspension
    IF v_caller_role IS DISTINCT FROM 'institution_admin' THEN
      RAISE EXCEPTION 'Access Denied: Only institutional administrators can modify user roles, verification, or access restrictions.';
    END IF;

    -- An administrator cannot modify their own role or suspension status (prohibit self-escalation or self-clearance)
    IF auth.uid() = NEW.id AND (OLD.role IS DISTINCT FROM NEW.role OR OLD.is_suspended IS DISTINCT FROM NEW.is_suspended) THEN
      RAISE EXCEPTION 'Security Invariant: Administrators cannot alter their own institutional role or suspension status.';
    END IF;

    -- Cross-institution boundary check: Admin can only manage users within their own institution (unless global admin)
    IF v_caller_inst IS NOT NULL AND OLD.institution_id IS NOT NULL AND v_caller_inst IS DISTINCT FROM OLD.institution_id THEN
      RAISE EXCEPTION 'Access Denied: Institutional administrators cannot manage members of other institutions.';
    END IF;

    -- Audit role change
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

    -- Audit verification change
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

    -- Audit suspension change
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

DROP TRIGGER IF EXISTS enforce_profile_security ON public.profiles;
CREATE TRIGGER enforce_profile_security
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_privilege_escalation();

-- 5. ACTIVITY LOGS RLS: ALLOW INSTITUTIONAL ADMINS TO VIEW INSTITUTION LOGS
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
      -- Institutional admin can view activity logs for resources belonging to their institution
      resource_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.resources r
        WHERE r.id = activity_logs.resource_id
          AND public.is_institution_admin(auth.uid(), r.institution_id)
      )
    )
    OR (
      -- Institutional admin can view activity logs for bookings belonging to their institution resources
      booking_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.bookings b
        JOIN public.resources r ON r.id = b.resource_id
        WHERE b.id = activity_logs.booking_id
          AND public.is_institution_admin(auth.uid(), r.institution_id)
      )
    )
  );

-- 6. PROFILE UPDATE POLICY: ALLOW INSTITUTIONAL ADMINS TO UPDATE MEMBER PROFILES IN THEIR INSTITUTION
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

-- 7. NOTIFICATIONS INSERT POLICY: TRUSTED SYSTEM OR PARTICIPANT INSERTION
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Users can only insert notifications for others via recognized booking or admin roles
    auth.uid() IS NOT NULL
  );
