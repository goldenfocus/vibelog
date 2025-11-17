-- Migration 028: Clean up video generation columns and add profile premium fields
-- Part 1: Add missing profile columns for premium tracking
-- Part 2: Remove video generation columns (keeping only user-uploaded video support)

-- ============================================================================
-- PART 1: Add missing profile columns (fixes production error)
-- ============================================================================

-- Add is_premium and subscription_tier to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium'));

-- Add index for premium users (for faster queries)
CREATE INDEX IF NOT EXISTS idx_profiles_premium ON profiles(is_premium) WHERE is_premium = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);

-- Add comments for documentation
COMMENT ON COLUMN profiles.is_premium IS 'Whether user has premium access (redundant with subscription_tier for backward compatibility)';
COMMENT ON COLUMN profiles.subscription_tier IS 'User subscription tier: free or premium';

-- ============================================================================
-- PART 2: Remove video generation columns (simplify to upload-only)
-- ============================================================================

-- Drop video generation status and error columns
ALTER TABLE vibelogs
  DROP COLUMN IF EXISTS video_generation_status,
  DROP COLUMN IF EXISTS video_generation_error,
  DROP COLUMN IF EXISTS video_generated_at,
  DROP COLUMN IF EXISTS video_request_id,
  DROP COLUMN IF EXISTS video_requested_at;

-- Drop video generation indexes
DROP INDEX IF EXISTS idx_vibelogs_video_generation_status;
DROP INDEX IF EXISTS idx_vibelogs_video_requested_at;

-- Update video_source constraint to only include 'captured' and 'uploaded'
-- Remove 'generated' option
ALTER TABLE vibelogs
  DROP CONSTRAINT IF EXISTS vibelogs_video_source_check;

ALTER TABLE vibelogs
  ADD CONSTRAINT vibelogs_video_source_check
  CHECK (video_source IN ('captured', 'uploaded'));

-- Update video_source default to 'captured' (camera is default)
ALTER TABLE vibelogs
  ALTER COLUMN video_source SET DEFAULT 'captured';

-- Update comment to reflect new options
COMMENT ON COLUMN vibelogs.video_source IS 'Source of video: captured (camera) or uploaded (file upload)';

-- Keep these video columns (essential for user videos):
-- - video_url (public URL of video)
-- - video_duration (in seconds)
-- - video_width (pixel width)
-- - video_height (pixel height)
-- - video_source ('captured' or 'uploaded')
-- - video_uploaded_at (timestamp when uploaded)

-- Drop video_queue table if it exists (used for AI generation queue)
DROP TABLE IF EXISTS video_queue CASCADE;
