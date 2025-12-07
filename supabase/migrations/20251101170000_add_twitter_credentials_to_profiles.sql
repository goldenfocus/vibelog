-- Add X (Twitter) credential columns to profiles
-- Migration: 019_add_twitter_credentials_to_profiles

-- Add columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'twitter_username') THEN
    ALTER TABLE profiles ADD COLUMN twitter_username TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'twitter_password') THEN
    ALTER TABLE profiles ADD COLUMN twitter_password TEXT;
  END IF;
END $$;
