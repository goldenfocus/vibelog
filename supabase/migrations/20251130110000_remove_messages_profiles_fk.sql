-- Remove FK that was added but causes insert failures for users without profiles
-- The messages.sender_id -> auth.users.id FK is sufficient
-- The messages.sender_id -> profiles.id FK was added in 20251130100000 but is not needed
-- since we now fetch profiles separately in the API (not via FK joins)
ALTER TABLE messages
DROP CONSTRAINT IF EXISTS messages_sender_id_profiles_fkey;
