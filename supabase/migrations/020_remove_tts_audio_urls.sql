-- Migration: Remove all TTS-generated audio URLs from vibelogs
-- Date: 2025-11-15
-- Description: Sets audio_url to NULL for all vibelogs that have TTS-generated audio
--              TTS audio URLs contain 'tts-audio' in the path
--              Original voice recordings (containing 'voices') are preserved

-- Remove all TTS audio URLs (containing 'tts-audio')
UPDATE vibelogs
SET audio_url = NULL
WHERE audio_url LIKE '%tts-audio%';

-- Optional: Add comment explaining the change
COMMENT ON COLUMN vibelogs.audio_url IS 'URL to original voice recording. TTS-generated audio has been removed as of 2025-11-15.';
