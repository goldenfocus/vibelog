-- Safe diagnosis of authentication issues - no table dependencies
-- Run this in your Supabase SQL editor

-- 1. Check if profiles table exists and structure
SELECT 'Profiles table structure:' as info;
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Check RLS policies on profiles
SELECT 'Profiles RLS policies:' as info;
SELECT
  policyname,
  cmd,
  permissive,
  roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles';

-- 3. Check triggers on auth.users
SELECT 'Triggers on auth.users:' as info;
SELECT
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'users' AND event_object_schema = 'auth';

-- 4. Check recent profiles (last 5)
SELECT 'Recent profiles created:' as info;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    PERFORM 1;
  END IF;
END $$;

SELECT
  id,
  email,
  username,
  created_at
FROM public.profiles
ORDER BY created_at DESC
LIMIT 5;

-- 5. Check constraints on profiles table
SELECT 'Constraints on profiles:' as info;
SELECT
  conname,
  contype
FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass;

-- 6. Test basic profile creation permissions
SELECT 'Testing profile creation permissions:' as info;
SELECT
  table_name,
  privilege_type,
  grantee
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND grantee IN ('authenticated', 'service_role', 'postgres');