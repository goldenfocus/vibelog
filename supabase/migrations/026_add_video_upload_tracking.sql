-- Add columns to track user-uploaded vs AI-generated videos
-- Part of pivot from AI video generation to user uploads

ALTER TABLE vibelogs
  ADD COLUMN IF NOT EXISTS video_source TEXT DEFAULT 'uploaded' CHECK (video_source IN ('uploaded', 'generated')),
  ADD COLUMN IF NOT EXISTS video_uploaded_at TIMESTAMPTZ;

-- Create index for filtering by video source
CREATE INDEX IF NOT EXISTS idx_vibelogs_video_source ON vibelogs(video_source) WHERE video_source IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN vibelogs.video_source IS 'Source of video: uploaded by user or AI-generated';
COMMENT ON COLUMN vibelogs.video_uploaded_at IS 'Timestamp when video was uploaded by user (NULL for AI-generated)';
