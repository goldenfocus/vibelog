-- Migration: Remove voice cloning database columns
-- Description: Clean up voice_clone_id and voice_cloning_enabled columns after feature removal
-- Date: 2025-11-15

-- Drop indexes first (must happen before dropping columns)
DROP INDEX IF EXISTS public.profiles_voice_clone_id_idx;
DROP INDEX IF EXISTS public.vibelogs_voice_clone_id_idx;

-- Drop columns from profiles table
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS voice_clone_id,
  DROP COLUMN IF EXISTS voice_clone_name,
  DROP COLUMN IF EXISTS voice_cloning_enabled;

-- Drop column from vibelogs table
ALTER TABLE public.vibelogs
  DROP COLUMN IF EXISTS voice_clone_id;

-- Note: comments.voice_id is kept as it's used for general TTS playback
-- with standard voices (shimmer, alloy, etc.), not specifically for cloning
