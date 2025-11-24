-- =====================================================
-- FIX CONVERSATIONS TABLE RLS FOR get_or_create_dm
-- =====================================================
-- Problem: get_or_create_dm function cannot INSERT into conversations
-- because it runs as SECURITY DEFINER without proper privileges
--
-- Solution: Make function run as SECURITY INVOKER so it uses
-- the caller's authentication context and passes RLS checks
-- =====================================================

-- Recreate get_or_create_dm with SECURITY INVOKER
CREATE OR REPLACE FUNCTION get_or_create_dm(user1_id UUID, user2_id UUID)
RETURNS UUID
SECURITY INVOKER  -- Run with caller's privileges (not definer's)
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  conversation_id UUID;
BEGIN
  -- Check if DM already exists (bidirectional check)
  SELECT c.id INTO conversation_id
  FROM conversations c
  INNER JOIN conversation_participants p1 ON c.id = p1.conversation_id
  INNER JOIN conversation_participants p2 ON c.id = p2.conversation_id
  WHERE c.type = 'dm'
    AND p1.user_id = user1_id
    AND p2.user_id = user2_id;

  -- If not found, create new DM
  IF conversation_id IS NULL THEN
    INSERT INTO conversations (type) VALUES ('dm') RETURNING id INTO conversation_id;

    -- Add both participants
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES
      (conversation_id, user1_id),
      (conversation_id, user2_id);
  END IF;

  RETURN conversation_id;
END;
$$;

-- Verify the function
SELECT
  'get_or_create_dm function' as function_name,
  prosecdef as is_security_definer,
  CASE
    WHEN prosecdef THEN 'SECURITY DEFINER (runs as owner)'
    ELSE 'SECURITY INVOKER (runs as caller)'
  END as security_mode
FROM pg_proc
WHERE proname = 'get_or_create_dm';
