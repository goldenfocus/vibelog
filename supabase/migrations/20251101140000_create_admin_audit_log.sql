-- Migration: Create Admin Audit Log
-- Description: Track all admin actions for security and accountability

-- Admin Audit Log: Track all administrative actions
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN (
    'god_mode_enter',
    'god_mode_exit',
    'vibelog_edit',
    'vibelog_delete',
    'user_update',
    'config_update',
    'admin_role_grant',
    'admin_role_revoke'
  )),
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_vibelog_id UUID REFERENCES public.vibelogs(id) ON DELETE SET NULL,
  details JSONB, -- Additional context about the action
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS admin_audit_log_admin_user_id_idx ON public.admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS admin_audit_log_created_at_idx ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_action_idx ON public.admin_audit_log(action);
CREATE INDEX IF NOT EXISTS admin_audit_log_target_user_idx ON public.admin_audit_log(target_user_id) WHERE target_user_id IS NOT NULL;

-- Comments
COMMENT ON TABLE public.admin_audit_log IS 'Comprehensive log of all administrative actions for security and compliance';
COMMENT ON COLUMN public.admin_audit_log.action IS 'Type of admin action performed';
COMMENT ON COLUMN public.admin_audit_log.details IS 'JSON object with action-specific details (e.g., changed fields, old/new values)';

-- RLS Policies

-- Only admins can read audit logs, service role can write
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'admin_audit_log' AND policyname = 'admin_audit_log select for admins'
  ) THEN
    CREATE POLICY "admin_audit_log select for admins" ON public.admin_audit_log
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'admin_audit_log' AND policyname = 'admin_audit_log insert for service role'
  ) THEN
    CREATE POLICY "admin_audit_log insert for service role" ON public.admin_audit_log
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

-- Helper function to log admin actions (callable from API routes)
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_admin_user_id UUID,
  p_action TEXT,
  p_target_user_id UUID DEFAULT NULL,
  p_target_vibelog_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  -- Verify the caller is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_admin_user_id AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'User % is not an admin', p_admin_user_id;
  END IF;

  -- Insert audit log entry
  INSERT INTO public.admin_audit_log (
    admin_user_id,
    action,
    target_user_id,
    target_vibelog_id,
    details,
    ip_address,
    user_agent
  ) VALUES (
    p_admin_user_id,
    p_action,
    p_target_user_id,
    p_target_vibelog_id,
    p_details,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Comment on function
COMMENT ON FUNCTION public.log_admin_action IS 'Securely log admin actions with verification of admin status';
