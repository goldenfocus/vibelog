-- Comprehensive diagnosis of authentication and user creation issues
-- Run this in your Supabase SQL editor to understand what's happening

-- 1. Check if profiles table exists and has correct structure
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Check existing RLS policies on profiles table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles';

-- 3. Check if triggers exist
SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users' AND event_object_schema = 'auth';

-- 4. Check recent profile creation attempts (if any exist)
SELECT
  id,
  email,
  username,
  created_at,
  provider
FROM public.profiles
ORDER BY created_at DESC
LIMIT 10;

-- 5. Check for any constraint violations or unique conflicts
SELECT
  conname,
  contype,
  confupdtype,
  confdeltype,
  confmatchtype
FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass;

-- 6. Check if vibelog_failures table exists (it might not)
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'vibelog_failures'
    ) THEN 'vibelog_failures table exists'
    ELSE 'vibelog_failures table does not exist (this is normal)'
  END as failure_table_status;

-- 7. Check if test function exists (will be created by the fix script)
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines
      WHERE routine_schema = 'public' AND routine_name = 'test_user_creation'
    ) THEN 'test_user_creation function exists'
    ELSE 'test_user_creation function does not exist yet (will be created by fix script)'
  END as test_function_status;

-- 8. Check auth.users table permissions and structure
SELECT
  table_name,
  privilege_type,
  grantee
FROM information_schema.table_privileges
WHERE table_schema = 'auth' AND table_name = 'users'
AND grantee IN ('authenticated', 'service_role', 'postgres');

-- 9. Check for any database logs or errors (if accessible)
-- Note: This might not work depending on your Supabase setup
-- SELECT * FROM pg_stat_activity WHERE state = 'active';