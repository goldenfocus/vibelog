-- Test DM creation functionality
-- This tests if the get_or_create_dm function works correctly
-- Run this while logged in as a user in Supabase SQL Editor

-- 1. Check if get_or_create_dm function exists
SELECT
  '1. FUNCTION CHECK' as test_step,
  routine_name,
  '✅ EXISTS' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_or_create_dm';

-- 2. Check your current user ID
SELECT
  '2. CURRENT USER' as test_step,
  auth.uid() as your_user_id,
  CASE
    WHEN auth.uid() IS NULL THEN '❌ NOT LOGGED IN'
    ELSE '✅ LOGGED IN'
  END as status;

-- 3. Test: Can you see any users in auth.users? (Service role only)
-- This will fail for normal users (expected), but shows if auth is working
SELECT
  '3. AUTH CHECK' as test_step,
  COUNT(*) as user_count,
  'If you see count > 0, auth is working' as note
FROM auth.users
LIMIT 1;

-- 4. Test: Can you query the profiles table?
SELECT
  '4. PROFILES ACCESS' as test_step,
  COUNT(*) as profile_count,
  'Should see profiles if RLS allows' as note
FROM profiles
LIMIT 5;

-- 5. Test: Can you query conversations table?
SELECT
  '5. CONVERSATIONS ACCESS' as test_step,
  COUNT(*) as conversation_count,
  'Should be 0 if no conversations yet' as note
FROM conversations;

-- 6. Test: Can you query conversation_participants?
SELECT
  '6. PARTICIPANTS ACCESS' as test_step,
  COUNT(*) as participant_count,
  'Should be 0 if no conversations yet' as note
FROM conversation_participants;

-- 7. Check RLS policies for conversations
SELECT
  '7. RLS POLICIES' as test_step,
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'conversations'
ORDER BY policyname;

-- 8. Try to manually test get_or_create_dm function
-- REPLACE 'other-user-uuid' with an actual user UUID from your database
-- You can find user UUIDs in the auth.users table or profiles table

-- Example (commented out - uncomment and replace UUID):
-- SELECT
--   '8. TEST DM CREATION' as test_step,
--   get_or_create_dm(
--     auth.uid(),
--     'REPLACE-WITH-ACTUAL-USER-UUID'::uuid
--   ) as conversation_id;

SELECT
  '8. DM CREATION TEST' as test_step,
  'Uncomment the query above and replace UUID to test' as instruction,
  'This will create or get a DM conversation' as note;

-- 9. If you created a DM above, verify it worked
SELECT
  '9. VERIFY DM' as test_step,
  c.id,
  c.type,
  c.created_at,
  COUNT(cp.user_id) as participant_count
FROM conversations c
LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id
WHERE c.type = 'dm'
GROUP BY c.id, c.type, c.created_at
ORDER BY c.created_at DESC
LIMIT 3;
