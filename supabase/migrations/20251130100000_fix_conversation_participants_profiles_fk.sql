-- =====================================================
-- FIX: Add foreign key from conversation_participants to profiles
-- =====================================================
-- Created: 2025-11-30
-- Description: Adds FK relationship to enable Supabase PostgREST joins
-- between conversation_participants and profiles
-- =====================================================

-- Add foreign key constraint (profiles.id mirrors auth.users.id)
-- This enables the PostgREST query: profiles!inner in conversation_participants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'conversation_participants_user_id_profiles_fkey'
    AND table_name = 'conversation_participants'
  ) THEN
    ALTER TABLE conversation_participants
    ADD CONSTRAINT conversation_participants_user_id_profiles_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Also add FK from messages.sender_id to profiles for consistent joins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'messages_sender_id_profiles_fkey'
    AND table_name = 'messages'
  ) THEN
    ALTER TABLE messages
    ADD CONSTRAINT messages_sender_id_profiles_fkey
    FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON CONSTRAINT conversation_participants_user_id_profiles_fkey ON conversation_participants
IS 'Enables PostgREST joins with profiles table';

COMMENT ON CONSTRAINT messages_sender_id_profiles_fkey ON messages
IS 'Enables PostgREST joins with profiles table';
