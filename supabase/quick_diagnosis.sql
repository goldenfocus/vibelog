-- Quick diagnosis - runs fast, no loops
-- Run this in your Supabase SQL editor

-- 1. Check if profiles table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'profiles'
) as profiles_table_exists;

-- 2. Check profiles table structure (only if it exists)
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 3. Check if handle_new_user function exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.routines
  WHERE routine_schema = 'public' AND routine_name = 'handle_new_user'
) as handle_new_user_exists;

-- 4. Check triggers on auth.users
SELECT
  trigger_name,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'users' AND event_object_schema = 'auth';

-- 5. Count existing profiles
SELECT COUNT(*) as total_profiles FROM public.profiles;

-- 6. Check RLS status
SELECT tablename, rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'profiles';