-- Fix: Make update_conversation_last_message trigger bypass RLS
--
-- Problem: The RLS policy on conversations only allows group creators to UPDATE.
-- This blocks the trigger from updating last_message_at for DM conversations.
--
-- Solution: Use SECURITY DEFINER so the function runs with elevated privileges.

-- Recreate the function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET
    last_message_id = NEW.id,
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill: Update all conversations with their correct last_message_at
-- This fixes existing conversations where the trigger failed due to RLS
WITH latest_messages AS (
  SELECT DISTINCT ON (conversation_id)
    conversation_id,
    id as message_id,
    created_at
  FROM messages
  WHERE is_deleted = false
  ORDER BY conversation_id, created_at DESC
)
UPDATE conversations c
SET
  last_message_id = lm.message_id,
  last_message_at = lm.created_at,
  updated_at = NOW()
FROM latest_messages lm
WHERE c.id = lm.conversation_id
  AND (c.last_message_at IS NULL OR c.last_message_at < lm.created_at);
