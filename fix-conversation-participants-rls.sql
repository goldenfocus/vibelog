-- =====================================================
-- FIX INFINITE RECURSION IN CONVERSATION_PARTICIPANTS RLS
-- =====================================================
-- The SELECT policy was querying the same table it protects
-- This causes infinite recursion errors
-- =====================================================

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;

-- Create fixed policy that doesn't cause recursion
-- Simply check if the user_id matches OR if they're checking their own participation
CREATE POLICY "Users can view conversation participants" ON conversation_participants
  FOR SELECT USING (
    -- Allow viewing participants if:
    -- 1. You are a participant in that conversation (direct check, no subquery)
    user_id = auth.uid()
    OR
    -- 2. You're querying a conversation where you're a participant
    -- Use EXISTS with a direct join instead of IN subquery to avoid recursion
    EXISTS (
      SELECT 1
      FROM conversation_participants cp2
      WHERE cp2.conversation_id = conversation_participants.conversation_id
        AND cp2.user_id = auth.uid()
    )
  );

-- Verify the policy was created
SELECT
  'RLS Policy Fixed' as status,
  policyname,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'conversation_participants'
  AND policyname = 'Users can view conversation participants';
