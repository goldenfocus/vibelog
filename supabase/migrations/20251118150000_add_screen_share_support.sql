-- Add screen-share capture mode support to vibelogs
-- Migration: 20251118150000_add_screen_share_support.sql
-- Purpose: Enable YouTuber-style screen recording with camera PiP overlay

-- Add capture_mode column to track recording type
ALTER TABLE vibelogs
  ADD COLUMN IF NOT EXISTS capture_mode TEXT DEFAULT 'audio'
    CHECK (capture_mode IN ('audio', 'camera', 'screen', 'screen-with-camera'));

-- Add flag to indicate camera picture-in-picture was used
ALTER TABLE vibelogs
  ADD COLUMN IF NOT EXISTS has_camera_pip BOOLEAN DEFAULT false;

-- Add index for filtering by capture mode (performance optimization)
CREATE INDEX IF NOT EXISTS idx_vibelogs_capture_mode
  ON vibelogs(capture_mode)
  WHERE capture_mode IN ('screen', 'screen-with-camera');

-- Add comment for documentation
COMMENT ON COLUMN vibelogs.capture_mode IS 'Type of recording: audio (mic only), camera (video), screen (screen share), screen-with-camera (screen + camera PiP)';
COMMENT ON COLUMN vibelogs.has_camera_pip IS 'True if screen recording includes camera picture-in-picture overlay';

-- Update existing records to have proper capture_mode based on existing data
UPDATE vibelogs
SET capture_mode = CASE
  WHEN video_url IS NOT NULL AND video_source IN ('captured', 'uploaded') THEN 'camera'
  WHEN audio_url IS NOT NULL THEN 'audio'
  ELSE 'audio'
END
WHERE capture_mode = 'audio'; -- Only update records that don't have capture_mode set
