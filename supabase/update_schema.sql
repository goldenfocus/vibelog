-- Update vibelogs table to support anonymous users and cover images
-- Run this in your Supabase SQL editor

-- First, let's modify the table structure
ALTER TABLE public.vibelogs
  -- Make user_id nullable to support anonymous users
  ALTER COLUMN user_id DROP NOT NULL,
  -- Make transcription nullable (in case it fails)
  ALTER COLUMN transcription DROP NOT NULL,
  -- Add session_id for anonymous users
  ADD COLUMN IF NOT EXISTS session_id text,
  -- Add cover image fields
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS cover_image_alt text,
  ADD COLUMN IF NOT EXISTS cover_image_width integer,
  ADD COLUMN IF NOT EXISTS cover_image_height integer;

-- Add index for session_id lookups
CREATE INDEX IF NOT EXISTS vibelogs_session_id_idx ON public.vibelogs (session_id);

-- Add constraint to ensure either user_id or session_id is present
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vibelogs_user_or_session_check'
  ) THEN
    ALTER TABLE public.vibelogs
      ADD CONSTRAINT vibelogs_user_or_session_check
      CHECK (user_id IS NOT NULL OR session_id IS NOT NULL);
  END IF;
END $$;

-- Update RLS policies to allow anonymous users to insert vibelogs

-- Drop old insert policy
DROP POLICY IF EXISTS "vibelogs insert own" ON public.vibelogs;

-- New insert policy that allows both authenticated and anonymous users
CREATE POLICY "vibelogs insert authenticated or anonymous" ON public.vibelogs
  FOR insert
  WITH CHECK (
    -- Authenticated users must use their own user_id
    (auth.uid() IS NOT NULL AND auth.uid() = user_id AND session_id IS NULL)
    OR
    -- Anonymous users can insert with session_id but no user_id
    (auth.uid() IS NULL AND user_id IS NULL AND session_id IS NOT NULL)
  );

-- Update select policy to allow reading anonymous vibelogs that are public
DROP POLICY IF EXISTS "vibelogs select public or own" ON public.vibelogs;

CREATE POLICY "vibelogs select policy" ON public.vibelogs
  FOR select
  USING (
    -- Public published posts
    (is_published AND is_public)
    OR
    -- Own posts (authenticated users)
    (auth.uid() = user_id)
    OR
    -- Service role can read everything
    (auth.role() = 'service_role')
  );

-- Add policy for anonymous read access (needed for the service to save vibelogs)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'vibelogs' AND policyname = 'allow service role full access'
  ) THEN
    CREATE POLICY "allow service role full access" ON public.vibelogs
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;