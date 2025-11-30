-- Performance indexes for feed queries
-- These compound indexes speed up the most common query patterns
-- Note: Not using CONCURRENTLY since migrations run in transactions

-- =============================================================================
-- VIBELOGS FEED INDEXES
-- =============================================================================

-- Main feed query: public published vibelogs sorted by published_at
-- Used by: home-feed, people page, profile pages
CREATE INDEX IF NOT EXISTS idx_vibelogs_public_feed
ON vibelogs(published_at DESC)
WHERE is_published = true AND is_public = true;

-- User's vibelogs (for dashboard, profile pages)
-- Used by: dashboard, profile pages
CREATE INDEX IF NOT EXISTS idx_vibelogs_user_created
ON vibelogs(user_id, created_at DESC);

-- Published vibelogs by user (for public profile)
CREATE INDEX IF NOT EXISTS idx_vibelogs_user_published
ON vibelogs(user_id, published_at DESC)
WHERE is_published = true AND is_public = true;

-- =============================================================================
-- COMMENTS INDEXES
-- =============================================================================

-- Comments for a vibelog sorted by creation (most common query)
-- Used by: comment loading on vibelog pages
CREATE INDEX IF NOT EXISTS idx_comments_vibelog_created
ON comments(vibelog_id, created_at DESC);

-- User's comments (for activity tracking)
CREATE INDEX IF NOT EXISTS idx_comments_user_created
ON comments(user_id, created_at DESC);

-- =============================================================================
-- PROFILES INDEXES
-- =============================================================================

-- Username lookup (for @username routes)
-- Used by: profile pages, @mentions
CREATE INDEX IF NOT EXISTS idx_profiles_username
ON profiles(username)
WHERE username IS NOT NULL;

-- =============================================================================
-- LIKES INDEXES
-- =============================================================================

-- Like count aggregation by user (for people page stats)
CREATE INDEX IF NOT EXISTS idx_vibelogs_user_likes
ON vibelogs(user_id, like_count)
WHERE is_published = true;
