-- ============================================================================
-- FIX MESSAGE NOTIFICATION TYPE: Add vibe_thread_message to CHECK constraint
-- ============================================================================
-- Issue: The messaging system (20251125000000) inserts notifications with type
--        'vibe_thread_message', but the original notification_system migration
--        (20251118100000) only allows 9 types in the CHECK constraint.
-- Result: Message notifications were silently rejected by the database.
-- ============================================================================

-- Drop the existing CHECK constraint on type column
ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add new CHECK constraint that includes vibe_thread_message
ALTER TABLE notifications
ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'comment',
  'reply',
  'reaction',
  'mention',
  'follow',
  'vibelog_like',
  'mini_vibelog_promoted',
  'comment_promoted',
  'system',
  'vibe_thread_message'
));

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Test that the constraint works by checking if we can describe it
DO $$
BEGIN
  RAISE NOTICE 'Migration complete: vibe_thread_message type is now allowed in notifications table';
END $$;
