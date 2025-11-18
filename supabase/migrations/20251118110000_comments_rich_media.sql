-- ============================================================================
-- RICH MEDIA COMMENTS: Photos, Videos, and Enhanced SEO
-- ============================================================================
-- Description: Extends comments to support multimedia attachments (photos, videos)
--              on top of voice/video/text content, with SEO/AEO superboost.
-- ============================================================================

-- Add rich media attachment columns to comments
ALTER TABLE comments ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;
-- Structure: [{ type: 'image' | 'video', url: string, thumbnail_url: string | null, width: number | null, height: number | null }]

ALTER TABLE comments ADD COLUMN IF NOT EXISTS attachment_count integer DEFAULT 0;

-- SEO/AEO enhancement columns
ALTER TABLE comments ADD COLUMN IF NOT EXISTS has_rich_media boolean DEFAULT false;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS media_description text; -- AI-generated description of attached media
ALTER TABLE comments ADD COLUMN IF NOT EXISTS media_alt_texts jsonb; -- Alt texts for each image attachment

-- Indexes for rich media queries
CREATE INDEX IF NOT EXISTS comments_has_rich_media_idx ON comments(has_rich_media) WHERE has_rich_media = true;
CREATE INDEX IF NOT EXISTS comments_attachment_count_idx ON comments(attachment_count) WHERE attachment_count > 0;

-- Function to count attachments and update has_rich_media flag
CREATE OR REPLACE FUNCTION update_comment_rich_media_flags()
RETURNS TRIGGER AS $$
BEGIN
  -- Count attachments
  NEW.attachment_count := jsonb_array_length(COALESCE(NEW.attachments, '[]'::jsonb));

  -- Set has_rich_media flag
  NEW.has_rich_media := (
    NEW.attachment_count > 0 OR
    NEW.video_url IS NOT NULL OR
    NEW.audio_url IS NOT NULL OR
    NEW.enhanced_cover_url IS NOT NULL
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update rich media flags
DROP TRIGGER IF EXISTS on_comment_rich_media_update ON comments;
CREATE TRIGGER on_comment_rich_media_update
  BEFORE INSERT OR UPDATE OF attachments, video_url, audio_url, enhanced_cover_url
  ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_rich_media_flags();

-- ============================================================================
-- COMMENT: Why rich media comments will boost SEO/AEO
-- ============================================================================
-- Rich media comments create more engaging, shareable mini-vibelogs:
-- 1. **Images**: Visual content increases time-on-page and social shares
-- 2. **Videos**: Native video embeds boost engagement metrics
-- 3. **Alt texts**: Improve accessibility and image search ranking
-- 4. **AI descriptions**: Generate searchable metadata for AEO
-- 5. **Structured data**: Ready for schema.org markup (future)
--
-- Example use case: User voice comments on a vibelog, adds 3 photos from
-- their gallery, AI generates alt texts and descriptions → This becomes
-- a mini-vibelog with /c/[slug] page, fully indexed by Google with
-- rich snippets for images, video, and audio content.
--
-- Fun fact: Comments with media get 3x more engagement than text-only! 📸✨
