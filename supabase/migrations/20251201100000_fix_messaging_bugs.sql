-- =====================================================
-- FIX MESSAGING BUGS
-- =====================================================
-- Created: 2025-12-01
-- Fixes:
--   1. get_unread_count returns 0 when last_read_at is NULL
--   2. Typing indicator stuck forever (no auto-cleanup)
--   3. Add presence index for efficient lookups
-- =====================================================

-- =====================================================
-- FIX 1: get_unread_count NULL handling
-- =====================================================
-- Problem: When last_read_at is NULL, the comparison
-- `m.created_at > cp.last_read_at` returns NULL (not true),
-- so ALL messages fail the filter and unread count is 0.
--
-- Fix: Treat NULL last_read_at as "never read anything" -
-- all messages from others should count as unread.
-- =====================================================

CREATE OR REPLACE FUNCTION get_unread_count(p_user_id UUID)
RETURNS TABLE(conversation_id UUID, unread_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.conversation_id,
    COUNT(*)::BIGINT AS unread_count
  FROM messages m
  INNER JOIN conversation_participants cp
    ON m.conversation_id = cp.conversation_id
    AND cp.user_id = p_user_id
  LEFT JOIN message_reads mr
    ON m.id = mr.message_id
    AND mr.user_id = p_user_id
  WHERE
    m.sender_id != p_user_id -- Don't count own messages
    AND mr.message_id IS NULL -- Not read yet
    AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at) -- NEW: Handle NULL properly
  GROUP BY m.conversation_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_unread_count IS 'Returns unread message count per conversation. Handles NULL last_read_at as "never read".';

-- =====================================================
-- FIX 2: Typing indicator auto-cleanup
-- =====================================================
-- Problem: The comment says "auto-clears after 3s" but there
-- was NO server-side mechanism to do this. If a user closes
-- their browser while typing, is_typing stays true forever.
--
-- Fix: Create a function that clears stale typing indicators.
-- This is called opportunistically when reading conversations.
-- =====================================================

CREATE OR REPLACE FUNCTION clear_stale_typing_indicators()
RETURNS void AS $$
BEGIN
  UPDATE conversation_participants
  SET is_typing = false
  WHERE is_typing = true
    AND typing_updated_at < NOW() - INTERVAL '5 seconds';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION clear_stale_typing_indicators IS 'Clears typing indicators older than 5 seconds. Call before fetching conversations.';

-- Also create a version that returns affected conversation IDs
-- (useful for knowing which conversations need UI update)
CREATE OR REPLACE FUNCTION clear_stale_typing_and_return()
RETURNS TABLE(conversation_id UUID, user_id UUID) AS $$
BEGIN
  RETURN QUERY
  UPDATE conversation_participants
  SET is_typing = false
  WHERE is_typing = true
    AND typing_updated_at < NOW() - INTERVAL '5 seconds'
  RETURNING conversation_participants.conversation_id, conversation_participants.user_id;
END;
$$ LANGUAGE plpgsql;

-- Update the comment on is_typing column to be accurate
COMMENT ON COLUMN conversation_participants.is_typing IS 'Typing indicator. Stale entries (>5s) are cleared by clear_stale_typing_indicators().';

-- =====================================================
-- FIX 3: Add presence index for efficient lookups
-- =====================================================
-- For Phase 4: Online/Last Active feature
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_presence_online
ON user_presence(user_id) WHERE status = 'online';

-- =====================================================
-- COMPLETE
-- =====================================================
