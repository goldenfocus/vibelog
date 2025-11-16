-- Clean up all TTS-generated audio URLs from vibelogs
-- This script removes audio_url for any vibelog that has a TTS-generated audio file
-- TTS audio URLs contain 'tts-audio' in the path
-- Original voice recordings are stored in 'voices' bucket and should be kept

-- First, let's see how many vibelogs have TTS audio
SELECT
  COUNT(*) as tts_audio_count,
  COUNT(DISTINCT user_id) as users_affected
FROM vibelogs
WHERE audio_url LIKE '%tts-audio%';

-- Now set those audio URLs to NULL
-- This will make vibelogs without original recordings have no audio playback
UPDATE vibelogs
SET audio_url = NULL
WHERE audio_url LIKE '%tts-audio%';

-- Verify the cleanup
SELECT
  COUNT(*) as remaining_tts_audio
FROM vibelogs
WHERE audio_url LIKE '%tts-audio%';

-- Show summary of what we have now
SELECT
  COUNT(*) as total_vibelogs,
  COUNT(audio_url) as vibelogs_with_audio,
  COUNT(CASE WHEN audio_url LIKE '%voices%' THEN 1 END) as original_voice_recordings,
  COUNT(CASE WHEN audio_url IS NULL THEN 1 END) as no_audio
FROM vibelogs;
