-- =====================================================
-- FIX CONVERSATIONS TABLE RLS (V3 - FINAL FIX)
-- =====================================================
-- Problem: get_or_create_dm function still cannot INSERT into conversations
-- even with SECURITY INVOKER because auth.uid() context is not preserved
-- inside the function execution.
--
-- Solution: Temporarily disable RLS for the function by using SECURITY DEFINER
-- and granting the function owner proper permissions to bypass RLS.
-- =====================================================

-- Step 1: Recreate function as SECURITY DEFINER with proper grants
CREATE OR REPLACE FUNCTION get_or_create_dm(user1_id UUID, user2_id UUID)
RETURNS UUID
SECURITY DEFINER  -- Run with function owner's privileges (bypasses RLS)
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  conversation_id UUID;
BEGIN
  -- Validate that caller is one of the two users
  IF auth.uid() IS NULL OR (auth.uid() != user1_id AND auth.uid() != user2_id) THEN
    RAISE EXCEPTION 'Unauthorized: You can only create conversations for yourself';
  END IF;

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

-- Step 2: Grant the function permission to bypass RLS
-- The function owner (postgres) needs explicit permission
GRANT ALL ON conversations TO postgres;
GRANT ALL ON conversation_participants TO postgres;

-- Step 3: Verify the function security mode
SELECT
  'get_or_create_dm function' as function_name,
  prosecdef as is_security_definer,
  CASE
    WHEN prosecdef THEN 'SECURITY DEFINER (runs as owner, can bypass RLS)'
    ELSE 'SECURITY INVOKER (runs as caller)'
  END as security_mode
FROM pg_proc
WHERE proname = 'get_or_create_dm';

-- Step 4: Test query to verify RLS policies are still active for direct access
SELECT
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'conversations'
ORDER BY policyname;
