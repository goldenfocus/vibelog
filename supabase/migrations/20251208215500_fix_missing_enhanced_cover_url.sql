-- ============================================================================
-- FIX: Add missing enhanced_cover_url column to comments
-- ============================================================================
-- Description: The on_comment_rich_media_update trigger references
--              enhanced_cover_url column but it was never created.
--              This causes insert failures (500 error) when creating comments.
-- ============================================================================

-- Add the missing column
ALTER TABLE comments ADD COLUMN IF NOT EXISTS enhanced_cover_url text;

-- Recreate the trigger with correct columns (only those that exist)
DROP TRIGGER IF EXISTS on_comment_rich_media_update ON comments;

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

-- Recreate trigger with all columns that now exist
CREATE TRIGGER on_comment_rich_media_update
  BEFORE INSERT OR UPDATE OF attachments, video_url, audio_url, enhanced_cover_url
  ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_rich_media_flags();
