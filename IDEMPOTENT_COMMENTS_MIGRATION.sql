-- ============================================================================
-- IDEMPOTENT COMMENTS MIGRATION - Safe to run multiple times
-- ============================================================================
-- This script only creates what's missing and skips what already exists.
-- Run this in Supabase SQL Editor to enable comments feature safely.
--
-- Date: 2025-11-18
-- Purpose: Fill gaps in comment system migration
-- ============================================================================

-- ============================================================================
-- STEP 1: Ensure base comments table exists with all required columns
-- ============================================================================

-- Create base table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vibelog_id uuid NOT NULL REFERENCES public.vibelogs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic content
  content text,
  audio_url text,
  voice_id text,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add columns if they don't exist (idempotent)
DO $$ BEGIN
  -- Video support
  ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS video_url text;
  ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS video_thumbnail_url text;
  ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS video_generation_status text DEFAULT 'idle';
  ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS video_generated_at timestamptz;

  -- Enhanced mini-vibelog columns
  ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS enhanced_content text;
  ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS enhanced_title text;
  ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS enhanced_audio_url text;
  ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS enhanced_cover_url text;
  ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS enhanced_vibe_scores jsonb;
  ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS enhanced_primary_vibe text;
  ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS processing_status text DEFAULT 'idle';
  ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS processing_error text;
  ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS is_mini_vibelog boolean DEFAULT false;
  ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS parent_comment_id uuid;
  ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS thread_position integer DEFAULT 0;

  -- Tier and promotion
  ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS comment_tier integer DEFAULT 1;
  ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS promoted_vibelog_id uuid;
  ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS promoted_at timestamptz;

  -- Engagement metrics
  ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS likes_count integer DEFAULT 0;
  ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS replies_count integer DEFAULT 0;
  ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS views_count integer DEFAULT 0;

  -- SEO and discoverability
  ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS slug text;
  ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;
  ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS seo_title text;
  ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS seo_description text;
  ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS conversation_thread_id uuid;

  -- Rich media attachments
  ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;
  ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS attachment_count integer DEFAULT 0;
  ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS has_rich_media boolean DEFAULT false;
  ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS media_description text;
  ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS media_alt_texts jsonb;
END $$;

-- Add constraints if they don't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'comments_video_generation_status_check'
  ) THEN
    ALTER TABLE public.comments ADD CONSTRAINT comments_video_generation_status_check
      CHECK (video_generation_status IN ('idle', 'generating', 'completed', 'failed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'comments_comment_tier_check'
  ) THEN
    ALTER TABLE public.comments ADD CONSTRAINT comments_comment_tier_check
      CHECK (comment_tier IN (1, 2, 3));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'comments_processing_status_check'
  ) THEN
    ALTER TABLE public.comments ADD CONSTRAINT comments_processing_status_check
      CHECK (processing_status IN ('idle', 'processing', 'completed', 'failed'));
  END IF;
END $$;

-- Add foreign key for parent_comment_id if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'comments_parent_comment_id_fkey'
  ) THEN
    ALTER TABLE public.comments
      ADD CONSTRAINT comments_parent_comment_id_fkey
      FOREIGN KEY (parent_comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'comments_promoted_vibelog_id_fkey'
  ) THEN
    ALTER TABLE public.comments
      ADD CONSTRAINT comments_promoted_vibelog_id_fkey
      FOREIGN KEY (promoted_vibelog_id) REFERENCES public.vibelogs(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Create indexes (idempotent)
-- ============================================================================
CREATE INDEX IF NOT EXISTS comments_vibelog_id_idx ON public.comments (vibelog_id);
CREATE INDEX IF NOT EXISTS comments_user_id_idx ON public.comments (user_id);
CREATE INDEX IF NOT EXISTS comments_created_at_idx ON public.comments (created_at);
CREATE INDEX IF NOT EXISTS comments_video_url_idx ON public.comments (video_url) WHERE video_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS comments_mini_vibelog_idx ON public.comments (vibelog_id, is_mini_vibelog) WHERE is_mini_vibelog = true;
CREATE INDEX IF NOT EXISTS comments_parent_idx ON public.comments (parent_comment_id) WHERE parent_comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS comments_processing_idx ON public.comments (processing_status);
CREATE INDEX IF NOT EXISTS comments_has_rich_media_idx ON public.comments(has_rich_media) WHERE has_rich_media = true;
CREATE INDEX IF NOT EXISTS comments_attachment_count_idx ON public.comments(attachment_count) WHERE attachment_count > 0;

-- ============================================================================
-- STEP 3: Enable RLS
-- ============================================================================
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: Create RLS policies (idempotent with DO blocks)
-- ============================================================================

-- Select policy
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
    AND tablename='comments'
    AND policyname='comments select public or own'
  ) THEN
    CREATE POLICY "comments select public or own" ON public.comments
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.vibelogs
          WHERE vibelogs.id = comments.vibelog_id
            AND (
              (vibelogs.is_published = true AND vibelogs.is_public = true)
              OR vibelogs.user_id = auth.uid()
              OR comments.user_id = auth.uid()
            )
        )
      );
  END IF;
END $$;

-- Insert policy
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
    AND tablename='comments'
    AND policyname='comments insert authenticated'
  ) THEN
    CREATE POLICY "comments insert authenticated" ON public.comments
      FOR INSERT TO authenticated
      WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
          SELECT 1 FROM public.vibelogs
          WHERE vibelogs.id = comments.vibelog_id
            AND (
              vibelogs.is_published = true
              OR vibelogs.user_id = auth.uid()
            )
        )
      );
  END IF;
END $$;

-- Update policy
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
    AND tablename='comments'
    AND policyname='comments update own'
  ) THEN
    CREATE POLICY "comments update own" ON public.comments
      FOR UPDATE TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Delete policy
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
    AND tablename='comments'
    AND policyname='comments delete own'
  ) THEN
    CREATE POLICY "comments delete own" ON public.comments
      FOR DELETE TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- STEP 5: Create functions and triggers
-- ============================================================================

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_comments_updated_at'
  ) THEN
    CREATE TRIGGER set_comments_updated_at
      BEFORE UPDATE ON public.comments
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- Mini vibelog flag function
CREATE OR REPLACE FUNCTION set_mini_vibelog_flag()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.audio_url IS NOT NULL AND NEW.enhanced_content IS NULL THEN
    NEW.is_mini_vibelog := true;
    NEW.processing_status := 'processing';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_mini_vibelog_trigger'
  ) THEN
    CREATE TRIGGER set_mini_vibelog_trigger
      BEFORE INSERT OR UPDATE ON public.comments
      FOR EACH ROW
      EXECUTE FUNCTION set_mini_vibelog_flag();
  END IF;
END $$;

-- Rich media flags function
CREATE OR REPLACE FUNCTION update_comment_rich_media_flags()
RETURNS TRIGGER AS $$
BEGIN
  NEW.attachment_count := jsonb_array_length(COALESCE(NEW.attachments, '[]'::jsonb));
  NEW.has_rich_media := (
    NEW.attachment_count > 0 OR
    NEW.video_url IS NOT NULL OR
    NEW.audio_url IS NOT NULL OR
    NEW.enhanced_cover_url IS NOT NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_comment_rich_media_update'
  ) THEN
    CREATE TRIGGER on_comment_rich_media_update
      BEFORE INSERT OR UPDATE OF attachments, video_url, audio_url, enhanced_cover_url
      ON public.comments
      FOR EACH ROW
      EXECUTE FUNCTION update_comment_rich_media_flags();
  END IF;
END $$;

-- ============================================================================
-- STEP 6: Add comment_count to vibelogs table
-- ============================================================================

ALTER TABLE public.vibelogs ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;

-- Ensure NOT NULL constraint
DO $$ BEGIN
  ALTER TABLE public.vibelogs ALTER COLUMN comment_count SET NOT NULL;
  ALTER TABLE public.vibelogs ALTER COLUMN comment_count SET DEFAULT 0;
EXCEPTION
  WHEN others THEN NULL; -- Column might already have constraint
END $$;

CREATE INDEX IF NOT EXISTS idx_vibelogs_comment_count ON public.vibelogs(comment_count);

-- Backfill comment counts
UPDATE public.vibelogs
SET comment_count = (
  SELECT COUNT(*)
  FROM public.comments
  WHERE comments.vibelog_id = vibelogs.id
)
WHERE comment_count = 0 OR comment_count IS NULL;

-- Comment count update function
CREATE OR REPLACE FUNCTION update_vibelog_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.vibelogs
    SET comment_count = comment_count + 1
    WHERE id = NEW.vibelog_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.vibelogs
    SET comment_count = GREATEST(0, comment_count - 1)
    WHERE id = OLD.vibelog_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger to ensure it's correct
DROP TRIGGER IF EXISTS trigger_update_comment_count ON public.comments;
CREATE TRIGGER trigger_update_comment_count
AFTER INSERT OR DELETE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION update_vibelog_comment_count();

-- ============================================================================
-- STEP 7: Create enhanced_comments view
-- ============================================================================

DROP VIEW IF EXISTS public.enhanced_comments CASCADE;

CREATE VIEW public.enhanced_comments AS
SELECT
  c.*,
  p.username,
  p.display_name,
  p.avatar_url,
  CASE
    WHEN c.is_mini_vibelog = true THEN
      jsonb_build_object(
        'title', c.enhanced_title,
        'content', c.enhanced_content,
        'audio_url', c.enhanced_audio_url,
        'cover_url', c.enhanced_cover_url,
        'vibe_scores', c.enhanced_vibe_scores,
        'primary_vibe', c.enhanced_primary_vibe
      )
    ELSE NULL
  END as mini_vibelog_data
FROM public.comments c
LEFT JOIN public.profiles p ON c.user_id = p.id;

-- ============================================================================
-- MIGRATION COMPLETE! ✅
-- ============================================================================
--
-- What was applied:
-- ✅ Comments table with all columns
-- ✅ All indexes for performance
-- ✅ RLS policies for security
-- ✅ Triggers for auto-updates
-- ✅ Comment count tracking on vibelogs
-- ✅ Enhanced comments view
--
-- Test it works:
-- SELECT COUNT(*) FROM comments; -- Should return 0 (or existing count)
-- SELECT comment_count FROM vibelogs LIMIT 5;
--
-- The "Comments will be available soon!" message should disappear now!
-- ============================================================================
