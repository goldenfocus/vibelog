-- Migration: Add video generation support to vibelogs
-- Created: 2025-11-15
-- Description: Adds video URL and metadata columns for AI-generated videos using fal.ai

-- Add video-related columns to vibelogs table
ALTER TABLE public.vibelogs
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS video_duration INTEGER,
  ADD COLUMN IF NOT EXISTS video_width INTEGER,
  ADD COLUMN IF NOT EXISTS video_height INTEGER,
  ADD COLUMN IF NOT EXISTS video_generation_status TEXT CHECK (
    video_generation_status IN ('pending', 'generating', 'completed', 'failed')
  ),
  ADD COLUMN IF NOT EXISTS video_generation_error TEXT,
  ADD COLUMN IF NOT EXISTS video_generated_at TIMESTAMPTZ;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_vibelogs_video_url
  ON public.vibelogs (video_url) WHERE video_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vibelogs_video_status
  ON public.vibelogs (video_generation_status) WHERE video_generation_status IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.vibelogs.video_url IS 'URL to AI-generated video stored in Supabase Storage (generated via fal.ai Veo 3.1)';
COMMENT ON COLUMN public.vibelogs.video_duration IS 'Video duration in seconds';
COMMENT ON COLUMN public.vibelogs.video_width IS 'Video width in pixels';
COMMENT ON COLUMN public.vibelogs.video_height IS 'Video height in pixels';
COMMENT ON COLUMN public.vibelogs.video_generation_status IS 'Status of video generation process';
COMMENT ON COLUMN public.vibelogs.video_generation_error IS 'Error message if video generation failed';
COMMENT ON COLUMN public.vibelogs.video_generated_at IS 'Timestamp when video was successfully generated';
