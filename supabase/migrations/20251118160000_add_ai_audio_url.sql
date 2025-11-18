-- Migration: Add ai_audio_url column to vibelogs table
-- This allows storing AI-generated narration audio alongside original recordings

-- Add ai_audio_url column to vibelogs table
ALTER TABLE public.vibelogs
ADD COLUMN IF NOT EXISTS ai_audio_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.vibelogs.ai_audio_url IS 'URL to AI-generated narration audio file (stored in Supabase Storage)';

-- Create index for faster queries that filter by AI audio existence
CREATE INDEX IF NOT EXISTS idx_vibelogs_ai_audio_url ON public.vibelogs(ai_audio_url) WHERE ai_audio_url IS NOT NULL;

-- Grant appropriate permissions (matching existing audio_url column permissions)
-- Authenticated users can read their own vibelogs' AI audio URLs
-- Public can read published vibelogs' AI audio URLs
