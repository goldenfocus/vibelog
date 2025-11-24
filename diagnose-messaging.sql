-- Diagnostic SQL to check messaging system health
-- Run this in Supabase SQL Editor

-- 1. Verify all tables exist
SELECT 'Tables Check' as check_type,
       STRING_AGG(table_name, ', ') as result
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('conversations', 'conversation_participants', 'messages', 'user_presence');

-- 2. Check RLS policies exist
SELECT 'RLS Policies' as check_type,
       tablename,
       policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('conversations', 'conversation_participants', 'messages', 'user_presence')
ORDER BY tablename, policyname;

-- 3. Check if tables have RLS enabled
SELECT 'RLS Enabled' as check_type,
       tablename,
       CASE WHEN rowsecurity THEN '✅ YES' ELSE '❌ NO' END as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('conversations', 'conversation_participants', 'messages', 'user_presence');

-- 4. Check realtime publication
SELECT 'Realtime Tables' as check_type,
       schemaname,
       tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('conversations', 'conversation_participants', 'messages', 'user_presence');

-- 5. Test query: Can current user see conversations?
-- This will show if RLS is blocking access
SELECT 'Test Query' as check_type,
       COUNT(*) as your_conversations
FROM conversations c
WHERE EXISTS (
  SELECT 1 FROM conversation_participants cp
  WHERE cp.conversation_id = c.id
    AND cp.user_id = auth.uid()
);
