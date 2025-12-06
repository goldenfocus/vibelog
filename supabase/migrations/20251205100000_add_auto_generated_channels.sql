-- ============================================================================
-- AUTO-GENERATED CHANNELS MIGRATION
-- ============================================================================
-- Add columns to support auto-generated channels from AI topic detection
-- Channels are now created automatically when users post vibelogs
-- ============================================================================

-- Add auto_generated flag to distinguish manual vs auto-created channels
ALTER TABLE channels ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT false;

-- Add AI-generated display name (creative name like "Awakening Echoes")
-- Regular "name" column remains as stable fallback (e.g., "Spirituality")
ALTER TABLE channels ADD COLUMN IF NOT EXISTS ai_display_name TEXT;

-- Add index for querying auto-generated channels
CREATE INDEX IF NOT EXISTS idx_channels_auto_generated ON channels(owner_id, auto_generated) WHERE auto_generated = true;

-- Add index for finding user's channel by topic (for ensureChannelForTopic)
CREATE INDEX IF NOT EXISTS idx_channels_owner_topic ON channels(owner_id, primary_topic) WHERE primary_topic IS NOT NULL;

-- Add comments
COMMENT ON COLUMN channels.auto_generated IS 'True if channel was created automatically from vibelog topic detection';
COMMENT ON COLUMN channels.ai_display_name IS 'AI-generated creative display name (e.g., "Awakening Echoes"), falls back to name if null';
