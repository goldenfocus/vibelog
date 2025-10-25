-- Simple one-time update to sync OAuth avatars to profiles
-- Run this in Supabase SQL Editor

-- Update profiles with avatars from auth.users metadata
UPDATE profiles
SET
  avatar_url = COALESCE(
    (SELECT raw_user_meta_data->>'avatar_url' FROM auth.users WHERE id = profiles.id),
    (SELECT raw_user_meta_data->>'picture' FROM auth.users WHERE id = profiles.id),
    avatar_url
  ),
  updated_at = NOW()
WHERE
  -- Only update profiles that don't have an avatar OR have an empty avatar
  (avatar_url IS NULL OR avatar_url = '')
  AND
  -- And where the auth user has an avatar in metadata
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = profiles.id
    AND (
      raw_user_meta_data->>'avatar_url' IS NOT NULL
      OR raw_user_meta_data->>'picture' IS NOT NULL
    )
  );

-- Show results
SELECT
  id,
  username,
  display_name,
  avatar_url,
  updated_at
FROM profiles
WHERE avatar_url IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;
