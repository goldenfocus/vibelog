-- DIAGNOSTIC QUERIES - Run these in Supabase SQL Editor

-- 1. Check YOUR profile
SELECT id, username, email, created_at
FROM public.profiles
WHERE email LIKE '%yanik%'
LIMIT 5;

-- 2. Check ALL vibelogs (to see if any exist)
SELECT
  id,
  title,
  is_published,
  is_public,
  published_at,
  created_at,
  user_id
FROM public.vibelogs
ORDER BY created_at DESC
LIMIT 20;

-- 3. Check if any vibelogs are linked to your user
SELECT
  v.id,
  v.title,
  v.created_at,
  p.username,
  p.email
FROM public.vibelogs v
LEFT JOIN public.profiles p ON v.user_id = p.id
WHERE p.email LIKE '%yanik%'
ORDER BY v.created_at DESC
LIMIT 10;

-- 4. If the above returns nothing, check anonymous vibelogs
SELECT
  id,
  title,
  created_at,
  session_id,
  anonymous_session_id
FROM public.vibelogs
WHERE user_id IS NULL
ORDER BY created_at DESC
LIMIT 10;
