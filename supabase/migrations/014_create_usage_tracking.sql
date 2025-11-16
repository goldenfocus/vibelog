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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tts_usage_log' AND policyname = 'tts_usage_log select for admins'
  ) THEN
    CREATE POLICY "tts_usage_log select for admins" ON public.tts_usage_log
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tts_usage_log' AND policyname = 'tts_usage_log insert for service role'
  ) THEN
    CREATE POLICY "tts_usage_log insert for service role" ON public.tts_usage_log
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

-- user_quotas: Users can read their own, service role can manage
ALTER TABLE public.user_quotas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_quotas' AND policyname = 'user_quotas select own'
  ) THEN
    CREATE POLICY "user_quotas select own" ON public.user_quotas
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_quotas' AND policyname = 'user_quotas manage for service role'
  ) THEN
    CREATE POLICY "user_quotas manage for service role" ON public.user_quotas
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- app_config: Public read, admins can update
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'app_config' AND policyname = 'app_config select public'
  ) THEN
    CREATE POLICY "app_config select public" ON public.app_config
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'app_config' AND policyname = 'app_config update for admins'
  ) THEN
    CREATE POLICY "app_config update for admins" ON public.app_config
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        )
      );
  END IF;
END $$;
