-- Update video_source to distinguish camera capture from file upload
-- Part of camera capture feature (free tier) vs upload (premium)

-- Modify the CHECK constraint to include 'captured'
ALTER TABLE vibelogs
  DROP CONSTRAINT IF EXISTS vibelogs_video_source_check;

ALTER TABLE vibelogs
  ADD CONSTRAINT vibelogs_video_source_check
  CHECK (video_source IN ('captured', 'uploaded', 'generated'));

-- Update default to 'captured' (camera is now default)
ALTER TABLE vibelogs
  ALTER COLUMN video_source SET DEFAULT 'captured';

-- Add comment for documentation
COMMENT ON COLUMN vibelogs.video_source IS 'Source of video: captured (camera), uploaded (file), or generated (AI)';
