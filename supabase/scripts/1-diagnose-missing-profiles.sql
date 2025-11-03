-- ============================================================================
-- DIAGNOSTIC SCRIPT: Find Missing/Broken Profiles
-- ============================================================================
-- Purpose: Identify all users who won't appear on the people's page
-- Safe to run: READ-ONLY, no changes made
-- Run this first to see the scope of the problem
-- ============================================================================

-- 1. Find users in auth.users WITHOUT profiles
SELECT
  'Missing Profile' as issue_type,
  u.id as user_id,
  u.email,
  u.created_at as user_created_at,
  u.raw_user_meta_data->>'name' as google_name,
  u.raw_user_meta_data->>'email_verified' as email_verified
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ORDER BY u.created_at DESC;

-- 2. Find profiles with NULL username (won't appear on people's page)
SELECT
  'NULL Username' as issue_type,
  p.id as user_id,
  p.email,
  p.username,
  p.display_name,
  p.created_at,
  p.is_public
FROM public.profiles p
WHERE p.username IS NULL
ORDER BY p.created_at DESC;

-- 3. Find profiles that are not public (intentional or bug?)
SELECT
  'Not Public' as issue_type,
  p.id as user_id,
  p.email,
  p.username,
  p.display_name,
  p.is_public,
  p.created_at
FROM public.profiles p
WHERE p.is_public = false
ORDER BY p.created_at DESC;

-- 4. Summary statistics
SELECT
  'Total Auth Users' as metric,
  COUNT(*) as count
FROM auth.users
UNION ALL
SELECT
  'Total Profiles' as metric,
  COUNT(*) as count
FROM public.profiles
UNION ALL
SELECT
  'Missing Profiles' as metric,
  COUNT(*) as count
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
UNION ALL
SELECT
  'Profiles with NULL Username' as metric,
  COUNT(*) as count
FROM public.profiles
WHERE username IS NULL
UNION ALL
SELECT
  'Profiles Not Public' as metric,
  COUNT(*) as count
FROM public.profiles
WHERE is_public = false
UNION ALL
SELECT
  'Visible on People Page' as metric,
  COUNT(*) as count
FROM public.profiles
WHERE username IS NOT NULL AND is_public = true;

-- 5. Check specific users mentioned in the bug report
SELECT
  'Specific User Check' as check_type,
  u.email,
  CASE WHEN p.id IS NULL THEN 'Profile Missing' ELSE 'Profile Exists' END as profile_status,
  p.username,
  p.is_public,
  CASE
    WHEN p.id IS NULL THEN 'Will NOT appear'
    WHEN p.username IS NULL THEN 'Will NOT appear (null username)'
    WHEN p.is_public = false THEN 'Will NOT appear (not public)'
    ELSE 'Will appear'
  END as people_page_visibility
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email IN ('love@chicoman.com', 'thanhmai0107@gmail.com')
   OR p.username IN ('love', 'thanhmai0107');
