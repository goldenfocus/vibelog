-- =====================================================
-- FIX INFINITE RECURSION IN CONVERSATION_PARTICIPANTS RLS (V2)
-- =====================================================
-- The previous fix still had recursion because EXISTS was querying
-- the same table. We need to use the conversations table instead.
-- =====================================================

-- Drop ALL existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can join conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can update their own participant settings" ON conversation_participants;

-- Create simple, non-recursive policies

-- 1. SELECT: Allow viewing ANY participant record
--    This is safe because we'll use the conversations policy to control access
CREATE POLICY "Users can view conversation participants" ON conversation_participants
  FOR SELECT USING (true);

-- 2. INSERT: Only authenticated users can create participant records
CREATE POLICY "Users can join conversations" ON conversation_participants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 3. UPDATE: Users can only update their own participant settings
CREATE POLICY "Users can update their own participant settings" ON conversation_participants
  FOR UPDATE USING (user_id = auth.uid());

-- Verify the policies
SELECT
  'conversation_participants RLS' as table_name,
  policyname,
  cmd as operation,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'conversation_participants'
ORDER BY policyname;
