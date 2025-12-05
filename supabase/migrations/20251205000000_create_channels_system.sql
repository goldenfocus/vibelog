-- ============================================================================
-- CHANNELS SYSTEM MIGRATION
-- ============================================================================
-- Transform VibeLog from single-profile to multi-channel architecture
-- Each @handle is a channel. Users own channels. Existing users become channels.
--
-- This migration:
-- 1. Creates the channels table
-- 2. Creates channel_subscriptions table (replaces follows for channel-level)
-- 3. Creates channel_members table (for team collaboration)
-- 4. Adds channel_id to vibelogs
-- 5. Migrates existing profiles → default channels
-- 6. Migrates follows → channel_subscriptions
-- ============================================================================

-- ============================================================================
-- 0. CLEANUP (in case of partial previous run)
-- ============================================================================
DROP TABLE IF EXISTS channel_members CASCADE;
DROP TABLE IF EXISTS channel_subscriptions CASCADE;
DROP TABLE IF EXISTS channels CASCADE;
ALTER TABLE vibelogs DROP COLUMN IF EXISTS channel_id;
ALTER TABLE vibelogs DROP COLUMN IF EXISTS source_vibelog_id;

-- ============================================================================
-- 1. CHANNELS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identity (like profiles)
  handle TEXT UNIQUE NOT NULL,           -- @spirituality-vibe (lowercase, no @)
  name TEXT NOT NULL,                    -- "Spirituality & Growth"
  bio TEXT,
  avatar_url TEXT,
  header_image TEXT,

  -- Social links (inherited from profiles pattern)
  website_url TEXT,
  twitter_url TEXT,
  instagram_url TEXT,
  youtube_url TEXT,
  tiktok_url TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  facebook_url TEXT,
  threads_url TEXT,

  -- Categorization
  primary_topic TEXT,                    -- Main category (spirituality, business, etc.)
  topics TEXT[] DEFAULT '{}',            -- Multiple topics
  tags TEXT[] DEFAULT '{}',              -- Freeform tags

  -- AI Persona Settings
  persona JSONB DEFAULT '{}',            -- {voice_id, tone, style, language, formality}
  -- Example: {"voice_id": "alloy", "tone": "warm", "style": "conversational", "formality": "casual"}

  -- Channel Settings
  is_default BOOLEAN DEFAULT false,      -- User's primary channel (migrated from profile)
  is_public BOOLEAN DEFAULT true,
  allow_collabs BOOLEAN DEFAULT false,   -- Accept guest posts

  -- Stats (denormalized for performance)
  subscriber_count INT DEFAULT 0,
  vibelog_count INT DEFAULT 0,
  total_views BIGINT DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints (min 3 chars - shorter handles are pioneer accounts)
  CONSTRAINT valid_handle CHECK (handle ~ '^[a-z0-9][a-z0-9_-]{2,29}$')
);

-- Indexes for channels
CREATE INDEX idx_channels_owner ON channels(owner_id);
CREATE INDEX idx_channels_handle ON channels(handle);
CREATE INDEX idx_channels_primary_topic ON channels(primary_topic) WHERE primary_topic IS NOT NULL;
CREATE INDEX idx_channels_topics ON channels USING GIN(topics) WHERE array_length(topics, 1) > 0;
CREATE INDEX idx_channels_subscriber_count ON channels(subscriber_count DESC);
CREATE INDEX idx_channels_is_default ON channels(owner_id) WHERE is_default = true;

COMMENT ON TABLE channels IS 'Creator channels - each @handle is a channel owned by a user';
COMMENT ON COLUMN channels.handle IS 'Unique channel handle (lowercase, no @), appears in URLs as /@handle';
COMMENT ON COLUMN channels.is_default IS 'Primary channel for user (migrated from their profile)';
COMMENT ON COLUMN channels.persona IS 'AI persona settings: {voice_id, tone, style, formality, language}';

-- ============================================================================
-- 2. CHANNEL SUBSCRIPTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS channel_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Notification preferences per subscription
  notify_new_vibelogs BOOLEAN DEFAULT true,
  notify_live BOOLEAN DEFAULT true,

  -- Engagement tracking
  last_viewed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(channel_id, user_id)
);

CREATE INDEX idx_subscriptions_channel ON channel_subscriptions(channel_id, created_at DESC);
CREATE INDEX idx_subscriptions_user ON channel_subscriptions(user_id, created_at DESC);

COMMENT ON TABLE channel_subscriptions IS 'Channel subscriptions (users subscribe to channels)';

-- ============================================================================
-- 3. CHANNEL MEMBERS TABLE (for team collaboration)
-- ============================================================================
CREATE TABLE IF NOT EXISTS channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  role TEXT NOT NULL DEFAULT 'viewer',
  -- Roles: 'owner', 'admin', 'editor', 'viewer'
  -- owner: full control, can delete channel
  -- admin: manage members, settings, content
  -- editor: create/edit content only
  -- viewer: view analytics only

  permissions JSONB DEFAULT '{}',
  -- Fine-grained: {"can_post": true, "can_edit": true, "can_delete": false, "can_analytics": true}

  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(channel_id, user_id),
  CONSTRAINT valid_role CHECK (role IN ('owner', 'admin', 'editor', 'viewer'))
);

CREATE INDEX idx_channel_members_channel ON channel_members(channel_id);
CREATE INDEX idx_channel_members_user ON channel_members(user_id);

COMMENT ON TABLE channel_members IS 'Channel team members with role-based permissions';

-- ============================================================================
-- 4. ADD CHANNEL_ID TO VIBELOGS
-- ============================================================================
ALTER TABLE vibelogs ADD COLUMN channel_id UUID REFERENCES channels(id) ON DELETE SET NULL;
ALTER TABLE vibelogs ADD COLUMN source_vibelog_id UUID REFERENCES vibelogs(id) ON DELETE SET NULL;

CREATE INDEX idx_vibelogs_channel ON vibelogs(channel_id) WHERE channel_id IS NOT NULL;
CREATE INDEX idx_vibelogs_source ON vibelogs(source_vibelog_id) WHERE source_vibelog_id IS NOT NULL;

COMMENT ON COLUMN vibelogs.channel_id IS 'Channel this vibelog belongs to';
COMMENT ON COLUMN vibelogs.source_vibelog_id IS 'Original vibelog if this is a cross-post copy';

-- ============================================================================
-- 5. TRIGGERS & FUNCTIONS
-- ============================================================================

-- Auto-update updated_at for channels
CREATE OR REPLACE FUNCTION update_channel_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_channel_updated_at
  BEFORE UPDATE ON channels
  FOR EACH ROW
  EXECUTE FUNCTION update_channel_updated_at();

-- Auto-update subscriber count on subscription changes
CREATE OR REPLACE FUNCTION update_channel_subscriber_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE channels SET subscriber_count = subscriber_count + 1 WHERE id = NEW.channel_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE channels SET subscriber_count = GREATEST(subscriber_count - 1, 0) WHERE id = OLD.channel_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_subscription_count
  AFTER INSERT OR DELETE ON channel_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_channel_subscriber_count();

-- Auto-update vibelog count when vibelogs are added/removed from channels
CREATE OR REPLACE FUNCTION update_channel_vibelog_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.channel_id IS NOT NULL THEN
    UPDATE channels SET vibelog_count = vibelog_count + 1 WHERE id = NEW.channel_id;
  ELSIF TG_OP = 'DELETE' AND OLD.channel_id IS NOT NULL THEN
    UPDATE channels SET vibelog_count = GREATEST(vibelog_count - 1, 0) WHERE id = OLD.channel_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.channel_id IS DISTINCT FROM NEW.channel_id THEN
      IF OLD.channel_id IS NOT NULL THEN
        UPDATE channels SET vibelog_count = GREATEST(vibelog_count - 1, 0) WHERE id = OLD.channel_id;
      END IF;
      IF NEW.channel_id IS NOT NULL THEN
        UPDATE channels SET vibelog_count = vibelog_count + 1 WHERE id = NEW.channel_id;
      END IF;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_channel_vibelog_count
  AFTER INSERT OR UPDATE OF channel_id OR DELETE ON vibelogs
  FOR EACH ROW
  EXECUTE FUNCTION update_channel_vibelog_count();

-- Sync channel total_views from vibelogs
CREATE OR REPLACE FUNCTION sync_channel_total_views(p_channel_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE channels
  SET total_views = COALESCE((
    SELECT SUM(view_count)
    FROM vibelogs
    WHERE channel_id = p_channel_id
      AND is_published = true
      AND is_public = true
  ), 0)
  WHERE id = p_channel_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update channel total_views when vibelog view_count changes
CREATE OR REPLACE FUNCTION update_channel_views_on_vibelog_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.channel_id IS NOT NULL THEN
    PERFORM sync_channel_total_views(NEW.channel_id);
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.channel_id IS NOT NULL AND OLD.channel_id IS DISTINCT FROM NEW.channel_id THEN
    PERFORM sync_channel_total_views(OLD.channel_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_channel_views
  AFTER UPDATE OF view_count, channel_id ON vibelogs
  FOR EACH ROW
  EXECUTE FUNCTION update_channel_views_on_vibelog_change();

-- ============================================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on channels
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

-- Anyone can view public channels
CREATE POLICY "Public channels are viewable"
  ON channels FOR SELECT
  USING (is_public = true);

-- Users can view their own channels (including private ones)
CREATE POLICY "Users can view own channels"
  ON channels FOR SELECT
  USING (owner_id = auth.uid());

-- Channel members can view channels they're part of
CREATE POLICY "Members can view their channels"
  ON channels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM channel_members
      WHERE channel_members.channel_id = channels.id
      AND channel_members.user_id = auth.uid()
    )
  );

-- Users can create channels
CREATE POLICY "Users can create channels"
  ON channels FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Owners can update their channels
CREATE POLICY "Owners can update channels"
  ON channels FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid());

-- Owners can delete non-default channels
CREATE POLICY "Owners can delete non-default channels"
  ON channels FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid() AND is_default = false);

-- Enable RLS on channel_subscriptions
ALTER TABLE channel_subscriptions ENABLE ROW LEVEL SECURITY;

-- Anyone can view subscription counts (for displaying subscriber count)
CREATE POLICY "Anyone can view subscriptions"
  ON channel_subscriptions FOR SELECT
  USING (true);

-- Users can subscribe to channels
CREATE POLICY "Users can subscribe"
  ON channel_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can unsubscribe
CREATE POLICY "Users can unsubscribe"
  ON channel_subscriptions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Users can update their subscription preferences
CREATE POLICY "Users can update subscription prefs"
  ON channel_subscriptions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Enable RLS on channel_members
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;

-- Channel owners and admins can view members
CREATE POLICY "Owners/admins can view members"
  ON channel_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM channels
      WHERE channels.id = channel_members.channel_id
      AND channels.owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM channel_members cm
      WHERE cm.channel_id = channel_members.channel_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'admin')
    )
  );

-- Users can view their own memberships
CREATE POLICY "Users can view own memberships"
  ON channel_members FOR SELECT
  USING (user_id = auth.uid());

-- Channel owners can manage members
CREATE POLICY "Owners can manage members"
  ON channel_members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM channels
      WHERE channels.id = channel_members.channel_id
      AND channels.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- 7. DATA MIGRATION: PROFILES → CHANNELS
-- ============================================================================
-- Create default channel for each user who has vibelogs or followers
-- NOTE: Skips handles shorter than 3 chars (pioneer accounts get to keep short handles)

INSERT INTO channels (
  owner_id,
  handle,
  name,
  bio,
  avatar_url,
  header_image,
  website_url,
  twitter_url,
  instagram_url,
  youtube_url,
  tiktok_url,
  linkedin_url,
  github_url,
  facebook_url,
  threads_url,
  is_default,
  subscriber_count,
  vibelog_count,
  total_views,
  created_at
)
SELECT
  p.id AS owner_id,
  p.username AS handle,
  COALESCE(p.display_name, p.username) AS name,
  p.bio,
  p.avatar_url,
  p.header_image,
  p.website_url,
  p.twitter_url,
  p.instagram_url,
  p.youtube_url,
  p.tiktok_url,
  p.linkedin_url,
  p.github_url,
  p.facebook_url,
  p.threads_url,
  true AS is_default,
  COALESCE(p.follower_count, 0) AS subscriber_count,
  COALESCE(p.total_vibelogs, 0) AS vibelog_count,
  COALESCE(p.total_views, 0) AS total_views,
  p.created_at
FROM profiles p
WHERE p.username IS NOT NULL
  AND LENGTH(p.username) >= 3  -- Skip pioneer short handles (they keep old profile)
  AND (
    p.total_vibelogs > 0
    OR COALESCE(p.follower_count, 0) > 0
    OR EXISTS (SELECT 1 FROM vibelogs v WHERE v.user_id = p.id)
  )
ON CONFLICT (handle) DO NOTHING;

-- ============================================================================
-- 8. DATA MIGRATION: LINK VIBELOGS TO CHANNELS
-- ============================================================================
-- Update vibelogs to link to their owner's default channel

UPDATE vibelogs v
SET channel_id = c.id
FROM channels c
WHERE v.user_id = c.owner_id
  AND c.is_default = true
  AND v.channel_id IS NULL;

-- ============================================================================
-- 9. DATA MIGRATION: FOLLOWS → CHANNEL SUBSCRIPTIONS
-- ============================================================================
-- Migrate existing follows to channel subscriptions

INSERT INTO channel_subscriptions (channel_id, user_id, created_at)
SELECT
  c.id AS channel_id,
  f.follower_id AS user_id,
  f.created_at
FROM follows f
JOIN channels c ON c.owner_id = f.following_id AND c.is_default = true
ON CONFLICT (channel_id, user_id) DO NOTHING;

-- ============================================================================
-- 10. HELPER FUNCTIONS
-- ============================================================================

-- Get user's default channel
CREATE OR REPLACE FUNCTION get_user_default_channel(p_user_id UUID)
RETURNS UUID AS $$
  SELECT id FROM channels WHERE owner_id = p_user_id AND is_default = true LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Get channel by handle
CREATE OR REPLACE FUNCTION get_channel_by_handle(p_handle TEXT)
RETURNS TABLE (
  id UUID,
  owner_id UUID,
  handle TEXT,
  name TEXT,
  bio TEXT,
  avatar_url TEXT,
  header_image TEXT,
  subscriber_count INT,
  vibelog_count INT,
  total_views BIGINT,
  is_public BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
  SELECT
    c.id,
    c.owner_id,
    c.handle,
    c.name,
    c.bio,
    c.avatar_url,
    c.header_image,
    c.subscriber_count,
    c.vibelog_count,
    c.total_views,
    c.is_public,
    c.created_at
  FROM channels c
  WHERE c.handle = LOWER(p_handle)
    AND (c.is_public = true OR c.owner_id = auth.uid());
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if user is subscribed to channel
CREATE OR REPLACE FUNCTION is_subscribed_to_channel(p_channel_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM channel_subscriptions
    WHERE channel_id = p_channel_id AND user_id = p_user_id
  );
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Summary:
-- - Created channels table with AI persona support
-- - Created channel_subscriptions table
-- - Created channel_members table for team collaboration
-- - Added channel_id and source_vibelog_id to vibelogs
-- - Migrated existing profiles to default channels (handles >= 3 chars)
-- - Migrated follows to channel_subscriptions
-- - Set up RLS policies and triggers
-- - Pioneer accounts with short handles (<3 chars) keep their profile as-is
-- ============================================================================
