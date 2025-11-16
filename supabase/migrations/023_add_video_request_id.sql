-- Migration: Add video_request_id for async video generation
-- Created: 2025-11-16
-- Description: Adds video_request_id column to track fal.ai async job status

-- Add video_request_id column to vibelogs table
ALTER TABLE public.vibelogs
  ADD COLUMN IF NOT EXISTS video_request_id TEXT;

-- Add index for quick lookups
CREATE INDEX IF NOT EXISTS idx_vibelogs_video_request_id
  ON public.vibelogs (video_request_id) WHERE video_request_id IS NOT NULL;

-- Update the status check constraint to include 'queued' and 'processing'
ALTER TABLE public.vibelogs
  DROP CONSTRAINT IF EXISTS vibelogs_video_generation_status_check;

ALTER TABLE public.vibelogs
  ADD CONSTRAINT vibelogs_video_generation_status_check
  CHECK (video_generation_status IN ('queued', 'generating', 'processing', 'completed', 'failed'));

-- Add comment for documentation
COMMENT ON COLUMN public.vibelogs.video_request_id IS 'fal.ai async job request ID for tracking video generation status';
