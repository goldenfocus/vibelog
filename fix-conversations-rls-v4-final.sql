-- =====================================================
-- FIX CONVERSATIONS TABLE RLS (V4 - PRODUCTION FIX)
-- =====================================================
-- Problem: Multiple issues found:
-- 1. Duplicate RLS policies causing conflicts
-- 2. get_or_create_dm cannot INSERT due to RLS policy blocking it
-- 3. Auth context not preserved in function execution
--
-- Solution: Clean up duplicate policies and fix the function
-- =====================================================

-- Step 1: DROP ALL existing policies on conversations AND conversation_participants tables
-- conversations table
DROP POLICY IF EXISTS "Participants can update conversations" ON conversations;
DROP POLICY IF EXISTS "Participants can view conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update group conversations they created" ON conversations;
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;

-- conversation_participants table (fix the recursive SELECT policy!)
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can join conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can update their own participant settings" ON conversation_participants;

-- Step 2: Recreate clean, non-conflicting policies
-- SELECT: Users can only see conversations they're part of
CREATE POLICY "Users can view their conversations" ON conversations
  FOR SELECT USING (
    id IN (
      SELECT conversation_id
      FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

-- INSERT: Authenticated users can create conversations
-- (We'll handle authorization in the RPC function)
CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Only group creators can update group conversations
CREATE POLICY "Users can update group conversations they created" ON conversations
  FOR UPDATE USING (
    type = 'group' AND created_by = auth.uid()
  );

-- Step 2b: Recreate conversation_participants policies (NON-RECURSIVE!)
-- SELECT: Allow viewing ANY participant record (conversations policy controls access)
CREATE POLICY "Users can view conversation participants" ON conversation_participants
  FOR SELECT USING (true);

-- INSERT: Only authenticated users can create participant records
CREATE POLICY "Users can join conversations" ON conversation_participants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Users can only update their own participant settings
CREATE POLICY "Users can update their own participant settings" ON conversation_participants
  FOR UPDATE USING (user_id = auth.uid());

-- Step 3: Fix the get_or_create_dm function
-- Use SECURITY DEFINER so it can bypass RLS, but add auth check for safety
CREATE OR REPLACE FUNCTION get_or_create_dm(user1_id UUID, user2_id UUID)
RETURNS UUID
SECURITY DEFINER  -- Bypass RLS
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  conversation_id UUID;
  calling_user_id UUID;
BEGIN
  -- Get the authenticated user making this call
  calling_user_id := auth.uid();

  -- Security check: caller must be one of the two users
  IF calling_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Not authenticated';
  END IF;

  IF calling_user_id != user1_id AND calling_user_id != user2_id THEN
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
    -- Create conversation (bypasses RLS due to SECURITY DEFINER)
    INSERT INTO conversations (type, created_at, updated_at)
    VALUES ('dm', NOW(), NOW())
    RETURNING id INTO conversation_id;

    -- Add both participants
    INSERT INTO conversation_participants (conversation_id, user_id, joined_at)
    VALUES
      (conversation_id, user1_id, NOW()),
      (conversation_id, user2_id, NOW());
  END IF;

  RETURN conversation_id;
END;
$$;

-- Step 4: Verify the changes
SELECT
  '=== FUNCTION VERIFICATION ===' as section,
  proname as function_name,
  CASE WHEN prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security_mode
FROM pg_proc
WHERE proname = 'get_or_create_dm';

SELECT '=== POLICY VERIFICATION ===' as section;

SELECT
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'conversations'
ORDER BY cmd, policyname;
