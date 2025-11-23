-- Test SQL to check if messaging tables exist in production
-- Run this in Supabase SQL Editor first to check current state

-- 1. Check if tables exist
SELECT
  table_name,
  CASE
    WHEN table_name IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('conversations', 'conversation_participants', 'messages', 'user_presence')
ORDER BY table_name;

-- 2. If tables exist, count rows
SELECT
  (SELECT COUNT(*) FROM conversations) as conversations_count,
  (SELECT COUNT(*) FROM conversation_participants) as participants_count,
  (SELECT COUNT(*) FROM messages) as messages_count,
  (SELECT COUNT(*) FROM user_presence) as presence_count;
