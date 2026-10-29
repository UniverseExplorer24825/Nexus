-- ============================================================================
-- Migration 000008: Profile Verification Self-Request, RPC & Demo Readiness
-- ============================================================================

-- 1. Upgrade prevent_self_privilege_escalation trigger to permit users to request
-- verification (transitioning to 'pending' with documented notes), while strictly
-- preventing self-verification ('verified'), role changes, or suspension clearance.

CREATE OR REPLACE FUNCTION public.prevent_self_privilege_escalation()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  v_caller_role user_role;
  v_caller_inst UUID;
  v_is_self BOOLEAN;
  v_is_self_verification_request BOOLEAN;
BEGIN
  -- If invoked without auth context (migrations/service role), allow
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  v_is_self := (auth.uid() = NEW.id);

  -- Fetch caller role and institution
  SELECT role, institution_id INTO v_caller_role, v_caller_inst
  FROM public.profiles
  WHERE id = auth.uid();

  -- Check if user is requesting verification (only allowed: unverified/rejected -> pending)
  v_is_self_verification_request := (
    v_is_self AND
    OLD.verification_status IN ('unverified', 'rejected') AND
    NEW.verification_status = 'pending' AND
    OLD.role = NEW.role AND
    OLD.is_suspended = NEW.is_suspended
  );

  -- Check if privileged fields are being modified
  IF (
    OLD.role IS DISTINCT FROM NEW.role OR
    OLD.verification_status IS DISTINCT FROM NEW.verification_status OR
    OLD.is_suspended IS DISTINCT FROM NEW.is_suspended
  ) THEN
    -- If it's a legitimate self-verification request, allow transition to 'pending'
    IF v_is_self_verification_request THEN
      -- Record activity log for verification request
      INSERT INTO public.activity_logs (actor_id, action_type, details)
      VALUES (
        auth.uid(),
        'member_verification_requested',
        jsonb_build_object(
          'user_id', NEW.id,
          'notes', NEW.verification_notes,
          'institution_id', NEW.institution_id
        )
      );
      RETURN NEW;
    END IF;

    -- Otherwise, only an institutional administrator can modify roles, statuses, or suspensions
    IF v_caller_role IS DISTINCT FROM 'institution_admin' THEN
      RAISE EXCEPTION 'Access Denied: Only institutional administrators can authorize verification, assign roles, or place holds.';
    END IF;

    -- An administrator cannot alter their own role or suspension status (prevents self-escalation or self-clearance)
    IF v_is_self AND (OLD.role IS DISTINCT FROM NEW.role OR OLD.is_suspended IS DISTINCT FROM NEW.is_suspended) THEN
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
        'member_verification_updated',
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

-- 2. Dedicated RPC for requesting institutional verification
CREATE OR REPLACE FUNCTION public.request_institutional_verification(notes TEXT DEFAULT NULL)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  v_uid UUID;
  v_current_status verification_status;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required to request verification.';
  END IF;

  SELECT verification_status INTO v_current_status
  FROM public.profiles
  WHERE id = v_uid;

  IF v_current_status = 'verified' THEN
    RAISE EXCEPTION 'Your institutional account is already verified.';
  END IF;

  IF v_current_status = 'pending' THEN
    RAISE EXCEPTION 'Verification request is already under administrative review.';
  END IF;

  UPDATE public.profiles
  SET
    verification_status = 'pending',
    verification_notes = COALESCE(notes, verification_notes),
    updated_at = NOW()
  WHERE id = v_uid;

  RETURN TRUE;
END;
$$;
