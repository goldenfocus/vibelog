-- Apply migration 018: Twitter Auto-Posting
-- This is the idempotent version - safe to run multiple times
-- You can run this directly in the Supabase SQL Editor if CLI isn't working

-- Create table only if it doesn't exist
CREATE TABLE IF NOT EXISTS vibelog_social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vibelog_id UUID NOT NULL REFERENCES vibelogs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('twitter', 'instagram', 'linkedin', 'tiktok', 'facebook', 'threads', 'youtube')),
  post_id TEXT,
  post_url TEXT,
  post_data JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'posting', 'posted', 'failed')),
  error_message TEXT,
  posted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(vibelog_id, platform)
);

-- Create indexes if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_vibelog_social_posts_vibelog') THEN
    CREATE INDEX idx_vibelog_social_posts_vibelog ON vibelog_social_posts(vibelog_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_vibelog_social_posts_user') THEN
    CREATE INDEX idx_vibelog_social_posts_user ON vibelog_social_posts(user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_vibelog_social_posts_platform') THEN
    CREATE INDEX idx_vibelog_social_posts_platform ON vibelog_social_posts(platform);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_vibelog_social_posts_status') THEN
    CREATE INDEX idx_vibelog_social_posts_status ON vibelog_social_posts(status);
  END IF;
END $$;

-- Add columns to profiles if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'auto_post_twitter') THEN
    ALTER TABLE profiles ADD COLUMN auto_post_twitter BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'auto_post_instagram') THEN
    ALTER TABLE profiles ADD COLUMN auto_post_instagram BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'auto_post_linkedin') THEN
    ALTER TABLE profiles ADD COLUMN auto_post_linkedin BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'twitter_post_format') THEN
    ALTER TABLE profiles ADD COLUMN twitter_post_format TEXT DEFAULT 'teaser' CHECK (twitter_post_format IN ('teaser', 'full', 'custom'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'twitter_custom_template') THEN
    ALTER TABLE profiles ADD COLUMN twitter_custom_template TEXT;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE vibelog_social_posts ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view their own social posts" ON vibelog_social_posts;
CREATE POLICY "Users can view their own social posts"
  ON vibelog_social_posts
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own social posts" ON vibelog_social_posts;
CREATE POLICY "Users can insert their own social posts"
  ON vibelog_social_posts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own social posts" ON vibelog_social_posts;
CREATE POLICY "Users can update their own social posts"
  ON vibelog_social_posts
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own social posts" ON vibelog_social_posts;
CREATE POLICY "Users can delete their own social posts"
  ON vibelog_social_posts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create or replace the updated_at trigger function
CREATE OR REPLACE FUNCTION update_vibelog_social_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_update_vibelog_social_posts_updated_at ON vibelog_social_posts;
CREATE TRIGGER trigger_update_vibelog_social_posts_updated_at
  BEFORE UPDATE ON vibelog_social_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_vibelog_social_posts_updated_at();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 018 applied successfully! Twitter auto-posting tables and columns are ready.';
END $$;
