-- Remove FK that causes insert failures for users without profiles
-- The conversation_participants.user_id -> auth.users.id FK is sufficient
-- The FK to profiles was added for PostgREST joins, but we now fetch profiles separately
ALTER TABLE conversation_participants
DROP CONSTRAINT IF EXISTS conversation_participants_user_id_profiles_fkey;
