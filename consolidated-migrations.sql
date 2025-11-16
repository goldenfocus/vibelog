-- Migration: Create comments table for vibelogs
-- Allows users to comment on vibelogs with text or voice

-- Create comments table
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  vibelog_id uuid not null references public.vibelogs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Comment content
  content text, -- Text content (optional if audio_url is provided)
  audio_url text, -- URL to audio file for voice comments
  voice_id text, -- Voice clone ID used for TTS (if text comment was converted to voice)
  
  -- Metadata
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create indexes for efficient queries
create index if not exists comments_vibelog_id_idx on public.comments (vibelog_id);
create index if not exists comments_user_id_idx on public.comments (user_id);
create index if not exists comments_created_at_idx on public.comments (created_at);

-- Enable RLS
alter table public.comments enable row level security;

-- Anyone can view comments on public vibelogs or their own comments
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='comments' and policyname='comments select public or own'
  ) then
    create policy "comments select public or own" on public.comments
      for select
      using (
        -- Can view if vibelog is public and published, or if user owns the comment, or if user owns the vibelog
        exists (
          select 1 from public.vibelogs
          where vibelogs.id = comments.vibelog_id
            and (
              (vibelogs.is_published = true and vibelogs.is_public = true)
              or vibelogs.user_id = auth.uid()
              or comments.user_id = auth.uid()
            )
        )
      );
  end if;
end $$;

-- Authenticated users can insert their own comments
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='comments' and policyname='comments insert authenticated'
  ) then
    create policy "comments insert authenticated" on public.comments
      for insert to authenticated
      with check (
        auth.uid() = user_id
        and exists (
          select 1 from public.vibelogs
          where vibelogs.id = comments.vibelog_id
            and (
              vibelogs.is_published = true
              or vibelogs.user_id = auth.uid()
            )
        )
      );
  end if;
end $$;

-- Users can update their own comments
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='comments' and policyname='comments update own'
  ) then
    create policy "comments update own" on public.comments
      for update to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

-- Users can delete their own comments
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='comments' and policyname='comments delete own'
  ) then
    create policy "comments delete own" on public.comments
      for delete to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

-- Trigger to update updated_at on comment updates
do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'set_comments_updated_at'
  ) then
    create trigger set_comments_updated_at
      before update on public.comments
      for each row
      execute function public.set_updated_at();
  end if;
end $$;

-- Migration: Add Admin Role
-- Description: Add is_admin column to profiles table for admin permissions

-- Add is_admin column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false NOT NULL;

-- Create index for fast admin checks (only index true values for efficiency)
CREATE INDEX IF NOT EXISTS profiles_is_admin_idx
ON public.profiles (is_admin)
WHERE is_admin = true;

-- Comment on column
COMMENT ON COLUMN public.profiles.is_admin IS 'Whether the user has admin privileges';

-- Note: To set specific users as admins, run queries like:
-- UPDATE public.profiles SET is_admin = true WHERE email = 'admin@example.com';
-- Or manually set is_admin = true in Supabase dashboard for specific user IDs
-- Migration: Create Usage Tracking Tables
-- Description: Tables for tracking TTS usage, quotas, and app configuration

-- TTS Usage Log: Track every TTS/audio playback request
CREATE TABLE IF NOT EXISTS public.tts_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  vibelog_id UUID REFERENCES public.vibelogs(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('preview', 'full_play', 'tts_generate')),
  audio_duration INTEGER, -- Duration in seconds
  service TEXT CHECK (service IN ('original', 'openai', 'modal', 'cache')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS tts_usage_log_user_id_idx ON public.tts_usage_log(user_id);
CREATE INDEX IF NOT EXISTS tts_usage_log_created_at_idx ON public.tts_usage_log(created_at DESC);
CREATE INDEX IF NOT EXISTS tts_usage_log_action_idx ON public.tts_usage_log(action);

-- Comments
COMMENT ON TABLE public.tts_usage_log IS 'Logs all TTS and audio playback requests for analytics';
COMMENT ON COLUMN public.tts_usage_log.action IS 'Type of action: preview (9-sec), full_play, or tts_generate';
COMMENT ON COLUMN public.tts_usage_log.service IS 'Audio source: original recording, openai tts, modal tts, or cache';

-- User Quotas: Track daily usage limits per user
CREATE TABLE IF NOT EXISTS public.user_quotas (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tts_count INTEGER DEFAULT 0 NOT NULL,
  last_reset_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS user_quotas_last_reset_idx ON public.user_quotas(last_reset_at);

-- Comments
COMMENT ON TABLE public.user_quotas IS 'Tracks daily TTS usage quotas per user';
COMMENT ON COLUMN public.user_quotas.tts_count IS 'Number of TTS generations used today';
COMMENT ON COLUMN public.user_quotas.last_reset_at IS 'When the quota was last reset (daily reset)';

-- App Configuration: Store configurable limits and settings
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Insert default configuration values
INSERT INTO public.app_config (key, value, description) VALUES
  ('tts_quota_anonymous', '3'::jsonb, 'Daily TTS generation limit for anonymous users'),
  ('tts_quota_registered', '30'::jsonb, 'Daily TTS generation limit for registered users'),
  ('cost_alert_threshold', '90'::jsonb, 'Monthly cost threshold in USD for alerts'),
  ('preview_duration_seconds', '9'::jsonb, 'Preview audio duration for anonymous users in seconds')
ON CONFLICT (key) DO NOTHING;

-- Comments
COMMENT ON TABLE public.app_config IS 'Application-wide configuration settings';

-- RLS Policies

-- tts_usage_log: Admins can read all, service role can write
ALTER TABLE public.tts_usage_log ENABLE ROW LEVEL SECURITY;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'tts_usage_log'
      and policyname = 'tts_usage_log select for admins'
  ) then
    create policy "tts_usage_log select for admins" on public.tts_usage_log
      for select
      using (
        exists (
          select 1 from public.profiles
          where profiles.id = auth.uid() and profiles.is_admin = true
        )
      );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'tts_usage_log'
      and policyname = 'tts_usage_log insert for service role'
  ) then
    create policy "tts_usage_log insert for service role" on public.tts_usage_log
      for insert
      to service_role
      with check (true);
  end if;
end $$;

-- user_quotas: Users can read their own, service role can manage
ALTER TABLE public.user_quotas ENABLE ROW LEVEL SECURITY;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_quotas'
      and policyname = 'user_quotas select own'
  ) then
    create policy "user_quotas select own" on public.user_quotas
      for select
      using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_quotas'
      and policyname = 'user_quotas manage for service role'
  ) then
    create policy "user_quotas manage for service role" on public.user_quotas
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end $$;

-- app_config: Public read, admins can update
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'app_config'
      and policyname = 'app_config select public'
  ) then
    create policy "app_config select public" on public.app_config
      for select
      using (true);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'app_config'
      and policyname = 'app_config update for admins'
  ) then
    create policy "app_config update for admins" on public.app_config
      for update
      using (
        exists (
          select 1 from public.profiles
          where profiles.id = auth.uid() and profiles.is_admin = true
        )
      )
      with check (
        exists (
          select 1 from public.profiles
          where profiles.id = auth.uid() and profiles.is_admin = true
        )
      );
  end if;
end $$;
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

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_audit_log'
      and policyname = 'admin_audit_log select for admins'
  ) then
    create policy "admin_audit_log select for admins" on public.admin_audit_log
      for select
      using (
        exists (
          select 1 from public.profiles
          where profiles.id = auth.uid() and profiles.is_admin = true
        )
      );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_audit_log'
      and policyname = 'admin_audit_log insert for service role'
  ) then
    create policy "admin_audit_log insert for service role" on public.admin_audit_log
      for insert
      to service_role
      with check (true);
  end if;
end $$;

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
