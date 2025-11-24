-- =====================================================
-- COMPREHENSIVE MESSAGING SYSTEM VERIFICATION
-- =====================================================
-- Run this AFTER applying fix-messaging-realtime-production.sql
-- This will verify everything is working correctly
-- =====================================================

-- 1. Check all tables exist
SELECT
  '1. TABLES' as check_section,
  table_name,
  '✅ EXISTS' as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('conversations', 'conversation_participants', 'messages', 'message_reads', 'user_presence', 'follows')
ORDER BY table_name;

-- 2. Check RLS is enabled
SELECT
  '2. RLS ENABLED' as check_section,
  tablename,
  CASE WHEN rowsecurity THEN '✅ YES' ELSE '❌ NO' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('conversations', 'conversation_participants', 'messages', 'message_reads', 'user_presence', 'follows')
ORDER BY tablename;

-- 3. Count RLS policies per table
SELECT
  '3. RLS POLICIES' as check_section,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('conversations', 'conversation_participants', 'messages', 'message_reads', 'user_presence', 'follows')
GROUP BY tablename
ORDER BY tablename;

-- 4. List all RLS policies
SELECT
  '4. POLICY DETAILS' as check_section,
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('conversations', 'conversation_participants', 'messages', 'message_reads', 'user_presence', 'follows')
ORDER BY tablename, policyname;

-- 5. Check realtime publication (CRITICAL)
SELECT
  '5. REALTIME' as check_section,
  tablename,
  '✅ IN PUBLICATION' as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('conversations', 'conversation_participants', 'messages', 'message_reads', 'user_presence')
ORDER BY tablename;

-- 6. Verify helper functions exist
SELECT
  '6. FUNCTIONS' as check_section,
  routine_name,
  '✅ EXISTS' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_or_create_dm', 'get_unread_count', 'mark_conversation_read')
ORDER BY routine_name;

-- 7. Check triggers exist
SELECT
  '7. TRIGGERS' as check_section,
  trigger_name,
  event_object_table as table_name,
  '✅ ACTIVE' as status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN ('conversations', 'conversation_participants', 'messages', 'message_reads', 'user_presence', 'follows')
ORDER BY event_object_table, trigger_name;

-- 8. Test: Can current user see conversations? (Should return 0 if no messages yet)
SELECT
  '8. TEST QUERY' as check_section,
  'Current user can query conversations table' as test_name,
  COUNT(*) as your_conversations
FROM conversations c
WHERE EXISTS (
  SELECT 1 FROM conversation_participants cp
  WHERE cp.conversation_id = c.id
    AND cp.user_id = auth.uid()
);

-- 9. Summary: What should we expect?
SELECT
  '9. EXPECTED RESULTS' as check_section,
  'Tables: 6 (conversations, conversation_participants, messages, message_reads, user_presence, follows)' as expectation
UNION ALL
SELECT '9. EXPECTED RESULTS', 'RLS: All 6 tables should have RLS enabled'
UNION ALL
SELECT '9. EXPECTED RESULTS', 'Policies: ~15-20 total policies across all tables'
UNION ALL
SELECT '9. EXPECTED RESULTS', 'Realtime: 5 tables in supabase_realtime publication'
UNION ALL
SELECT '9. EXPECTED RESULTS', 'Functions: 3 helper functions (get_or_create_dm, get_unread_count, mark_conversation_read)'
UNION ALL
SELECT '9. EXPECTED RESULTS', 'Triggers: Multiple triggers for updated_at, follower counts, notifications';
