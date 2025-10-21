-- Migration: Add support for anonymous VibeLog creation and ownership transfer
-- Date: 2025-10-21
-- Purpose: Enable friction-free publishing with optional account claiming

-- 1. Make user_id nullable to support anonymous posts
ALTER TABLE public.vibelogs ALTER COLUMN user_id DROP NOT NULL;

-- 2. Add new columns for anonymous publishing
ALTER TABLE public.vibelogs ADD COLUMN IF NOT EXISTS anonymous_session_id TEXT;
ALTER TABLE public.vibelogs ADD COLUMN IF NOT EXISTS public_slug TEXT UNIQUE;
ALTER TABLE public.vibelogs ADD COLUMN IF NOT EXISTS redirect_to TEXT;
ALTER TABLE public.vibelogs ADD COLUMN IF NOT EXISTS cover_url TEXT;
ALTER TABLE public.vibelogs ADD COLUMN IF NOT EXISTS cover_preview_url TEXT;
ALTER TABLE public.vibelogs ADD COLUMN IF NOT EXISTS cover_placeholder TEXT; -- base64 tiny preview
ALTER TABLE public.vibelogs ADD COLUMN IF NOT EXISTS seo_title TEXT;
ALTER TABLE public.vibelogs ADD COLUMN IF NOT EXISTS seo_description TEXT;
ALTER TABLE public.vibelogs ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

-- 3. Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_vibelogs_public_slug ON public.vibelogs(public_slug) WHERE public_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vibelogs_session_id ON public.vibelogs(anonymous_session_id) WHERE anonymous_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vibelogs_slug ON public.vibelogs(slug) WHERE slug IS NOT NULL;

-- 4. Update RLS policies to allow anonymous inserts and public reads

-- Drop old policies
DROP POLICY IF EXISTS "vibelogs select public or own" ON public.vibelogs;
DROP POLICY IF EXISTS "vibelogs insert own" ON public.vibelogs;
DROP POLICY IF EXISTS "vibelogs update own" ON public.vibelogs;
DROP POLICY IF EXISTS "vibelogs delete own" ON public.vibelogs;

-- New: Allow anyone to read published public vibelogs
CREATE POLICY "vibelogs_select_public" ON public.vibelogs
  FOR SELECT
  USING (
    (is_published AND is_public)
    OR auth.uid() = user_id
  );

-- New: Allow anonymous inserts (for unauthenticated users)
CREATE POLICY "vibelogs_insert_anonymous" ON public.vibelogs
  FOR INSERT
  WITH CHECK (
    -- Allow authenticated users to insert their own
    (auth.uid() = user_id)
    OR
    -- Allow anonymous users to insert (user_id will be NULL)
    (auth.uid() IS NULL AND user_id IS NULL AND anonymous_session_id IS NOT NULL)
  );

-- New: Allow users to update their own vibelogs
CREATE POLICY "vibelogs_update_own" ON public.vibelogs
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- New: Allow users to delete their own vibelogs
CREATE POLICY "vibelogs_delete_own" ON public.vibelogs
  FOR DELETE
  USING (auth.uid() = user_id);

-- New: Allow service role to update any vibelog (for ownership transfer)
CREATE POLICY "vibelogs_service_role_all" ON public.vibelogs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. Create helper function to generate unique public slug
CREATE OR REPLACE FUNCTION public.generate_public_slug(content_title TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 0;
BEGIN
  -- Extract first 5-6 words from title, slugify
  base_slug := lower(trim(regexp_replace(
    substring(content_title, 1, 50),
    '[^a-zA-Z0-9\s-]', '', 'g'
  )));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);

  -- Add random suffix to ensure uniqueness
  final_slug := base_slug || '-' || substring(md5(random()::text), 1, 8);

  -- Check if exists, keep regenerating until unique
  WHILE EXISTS (SELECT 1 FROM public.vibelogs WHERE public_slug = final_slug OR slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || substring(md5(random()::text || counter::text), 1, 8);
    IF counter > 100 THEN
      -- Fallback to pure random if we can't find a good slug
      final_slug := 'vibelog-' || substring(md5(random()::text), 1, 12);
    END IF;
  END LOOP;

  RETURN final_slug;
END;
$$;

-- 6. Create helper function to increment user vibelog count
CREATE OR REPLACE FUNCTION public.increment_vibelog_count(user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update user profile to increment vibelog count
  UPDATE public.profiles
  SET
    vibelog_count = COALESCE(vibelog_count, 0) + 1,
    updated_at = NOW()
  WHERE id = user_id;
END;
$$;

-- 7. Add comment for documentation
COMMENT ON COLUMN public.vibelogs.anonymous_session_id IS 'Session ID for anonymous posts, used to claim ownership later';
COMMENT ON COLUMN public.vibelogs.public_slug IS 'Public URL slug for anonymous posts (/v/[public_slug])';
COMMENT ON COLUMN public.vibelogs.redirect_to IS 'URL to redirect to (for 301 redirects after ownership transfer)';
COMMENT ON COLUMN public.vibelogs.cover_preview_url IS 'Lower resolution preview image for faster loading';
COMMENT ON COLUMN public.vibelogs.cover_placeholder IS 'Base64 encoded tiny placeholder for instant display';
COMMENT ON COLUMN public.vibelogs.claimed_at IS 'Timestamp when anonymous post was claimed by a user';

-- 7. Sample data check (optional - can be commented out)
-- SELECT
--   id,
--   user_id,
--   anonymous_session_id,
--   public_slug,
--   slug,
--   is_published,
--   is_public,
--   created_at
-- FROM public.vibelogs
-- ORDER BY created_at DESC
-- LIMIT 5;
