-- Fix existing user data that was created before the migrations
-- Run this ONCE in your Supabase SQL Editor

-- 1. Update existing profiles to have email-based usernames (if they're still 'user')
UPDATE public.profiles
SET
  username = CASE
    WHEN username = 'user' OR username IS NULL THEN
      lower(split_part(email, '@', 1))
    ELSE username
  END,
  updated_at = now()
WHERE username = 'user' OR username IS NULL;

-- 2. Fix vibelogs with NULL or epoch dates
UPDATE public.vibelogs
SET
  published_at = COALESCE(published_at, created_at, now()),
  is_published = true,
  is_public = true,
  updated_at = now()
WHERE published_at IS NULL
   OR published_at = '1970-01-01 00:00:00+00'::timestamptz
   OR NOT is_published;

-- 3. Verify the changes
SELECT
  id,
  username,
  email,
  created_at
FROM public.profiles
WHERE username != 'user'
LIMIT 5;

SELECT
  id,
  title,
  published_at,
  is_published,
  is_public,
  user_id
FROM public.vibelogs
WHERE is_published = true
ORDER BY published_at DESC
LIMIT 10;
