-- =====================================================
-- TEST DM CREATION FUNCTIONALITY
-- =====================================================
-- This diagnostic checks if the messaging system is working
-- Run this in Supabase SQL Editor while logged in as a user
-- =====================================================

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

-- 3. Check if you can see profiles
SELECT
  '3. PROFILES ACCESS' as test_step,
  COUNT(*) as profile_count,
  'Should see profiles if RLS allows' as note
FROM profiles;

-- 4. Test: Can you query conversations table?
SELECT
  '4. CONVERSATIONS ACCESS' as test_step,
  COUNT(*) as conversation_count,
  'Should be 0 if no conversations yet' as note
FROM conversations;

-- 5. Test: Can you query conversation_participants?
SELECT
  '5. PARTICIPANTS ACCESS' as test_step,
  COUNT(*) as participant_count,
  'Should be 0 if no conversations yet' as note
FROM conversation_participants;

-- 6. Check RLS policies for conversations
SELECT
  '6. RLS POLICIES' as test_step,
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('conversations', 'conversation_participants')
ORDER BY tablename, policyname;

-- 7. Get a sample user ID to test with (not yourself)
-- This finds another user you can try to message
SELECT
  '7. SAMPLE USERS' as test_step,
  id as user_id,
  username,
  display_name,
  'Use one of these UUIDs for testing below' as note
FROM profiles
WHERE id != auth.uid()
LIMIT 5;

-- 8. Manual test of get_or_create_dm function
-- UNCOMMENT and replace 'REPLACE-UUID-HERE' with a user ID from step 7
--
-- SELECT
--   '8. TEST DM CREATION' as test_step,
--   get_or_create_dm(
--     auth.uid(),
--     'REPLACE-UUID-HERE'::uuid
--   ) as conversation_id;

SELECT
  '8. DM CREATION TEST' as test_step,
  'Uncomment the query above and replace UUID to test DM creation' as instruction,
  'This will create or get a DM conversation' as note;

-- 9. Show all your conversations
SELECT
  '9. YOUR CONVERSATIONS' as test_step,
  c.id,
  c.type,
  c.created_at,
  COUNT(cp.user_id) as participant_count
FROM conversations c
INNER JOIN conversation_participants cp ON c.id = cp.conversation_id
WHERE cp.user_id = auth.uid()
GROUP BY c.id, c.type, c.created_at
ORDER BY c.created_at DESC;

-- 10. Check if POST to conversations would work (permission check)
SELECT
  '10. INSERT PERMISSION' as test_step,
  CASE
    WHEN has_table_privilege('conversations', 'INSERT') THEN '✅ CAN INSERT'
    ELSE '❌ CANNOT INSERT'
  END as can_create_conversations;
