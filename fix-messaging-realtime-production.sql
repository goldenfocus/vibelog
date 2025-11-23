-- =====================================================
-- FIX MESSAGING REALTIME PUBLICATION IN PRODUCTION
-- =====================================================
-- This fixes the "already member of publication" error
-- Safe to run in production - idempotent
-- =====================================================

-- Remove tables from realtime publication if they exist
-- This is safe - we'll add them back immediately
DO $$
BEGIN
  -- Try to drop each table from publication, ignore errors if not present
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE conversations;
  EXCEPTION
    WHEN undefined_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE conversation_participants;
  EXCEPTION
    WHEN undefined_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE messages;
  EXCEPTION
    WHEN undefined_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE message_reads;
  EXCEPTION
    WHEN undefined_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE user_presence;
  EXCEPTION
    WHEN undefined_object THEN NULL;
  END;
END $$;

-- Now add them back (this ensures they're in the publication)
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reads;
ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;

-- Verify all tables are in the publication
SELECT
  'Realtime Publication Check' as status,
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('conversations', 'conversation_participants', 'messages', 'message_reads', 'user_presence')
ORDER BY tablename;
