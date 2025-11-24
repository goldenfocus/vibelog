-- =====================================================
-- FIX MESSAGING SYSTEM - V6 CLEANUP (Remove Duplicate Policies)
-- =====================================================
-- Problem: You have DUPLICATE policies on conversation_participants:
-- - "Users can add themselves to conversations" (old)
-- - "Users can join conversations" (new)
-- - "Users can update own participation" (old)
-- - "Users can update their own participant settings" (new)
--
-- Having duplicates can cause conflicts and unexpected behavior.
-- This script removes ALL old policies and keeps only the correct ones.
-- =====================================================

-- =====================================================
-- STEP 1: Drop ALL existing policies (clean slate)
-- =====================================================

-- Drop ALL conversation_participants policies
DROP POLICY IF EXISTS "Users can add themselves to conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can join conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can update own participation" ON conversation_participants;
DROP POLICY IF EXISTS "Users can update their own participant settings" ON conversation_participants;

-- Drop ALL conversations policies
DROP POLICY IF EXISTS "Participants can update conversations" ON conversations;
DROP POLICY IF EXISTS "Participants can view conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update group conversations they created" ON conversations;
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;

-- =====================================================
-- STEP 2: Create CLEAN policies (no duplicates)
-- =====================================================

-- CONVERSATIONS TABLE
-- -------------------
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
CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Only group creators can update group conversations
CREATE POLICY "Users can update group conversations they created" ON conversations
  FOR UPDATE USING (
    type = 'group' AND created_by = auth.uid()
  );

-- CONVERSATION_PARTICIPANTS TABLE
-- --------------------------------
-- SELECT: Allow viewing ANY participant record (NON-RECURSIVE!)
-- The conversations policy above controls which conversations users can see
CREATE POLICY "Users can view conversation participants" ON conversation_participants
  FOR SELECT USING (true);

-- INSERT: Only authenticated users can create participant records
CREATE POLICY "Users can join conversations" ON conversation_participants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Users can only update their own participant settings
CREATE POLICY "Users can update their own participant settings" ON conversation_participants
  FOR UPDATE USING (user_id = auth.uid());

-- =====================================================
-- STEP 3: Verify get_or_create_dm function
-- =====================================================
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

-- =====================================================
-- STEP 4: Verification (Should show NO duplicates)
-- =====================================================
SELECT '=== FUNCTION VERIFICATION ===' as section;
SELECT
  proname as function_name,
  CASE WHEN prosecdef THEN 'SECURITY DEFINER ✓' ELSE 'SECURITY INVOKER ✗' END as security_mode
FROM pg_proc
WHERE proname = 'get_or_create_dm';

SELECT '=== CONVERSATIONS POLICIES (Should be 3) ===' as section;
SELECT
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'conversations'
ORDER BY cmd, policyname;

SELECT '=== CONVERSATION_PARTICIPANTS POLICIES (Should be 3) ===' as section;
SELECT
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'conversation_participants'
ORDER BY cmd, policyname;

-- =====================================================
-- EXPECTED OUTPUT:
-- =====================================================
-- Function: SECURITY DEFINER ✓
-- Conversations: EXACTLY 3 policies (INSERT, SELECT, UPDATE)
-- Participants: EXACTLY 3 policies (INSERT, SELECT, UPDATE)
-- NO DUPLICATES!
-- =====================================================
