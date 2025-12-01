-- ============================================================================
-- ENHANCED COMMENTS: VIDEO SUPPORT + TIER SYSTEM + DISCOVERY
-- ============================================================================

-- Add video support columns
ALTER TABLE comments ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS video_thumbnail_url text;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS video_generation_status text DEFAULT 'idle' CHECK (video_generation_status IN ('idle', 'generating', 'completed', 'failed'));
ALTER TABLE comments ADD COLUMN IF NOT EXISTS video_generated_at timestamptz;

-- Comment tier classification (1=Simple, 2=Mini-Vibelog, 3=Promoted)
ALTER TABLE comments ADD COLUMN IF NOT EXISTS comment_tier integer DEFAULT 1 CHECK (comment_tier IN (1, 2, 3));

-- Promotion tracking
ALTER TABLE comments ADD COLUMN IF NOT EXISTS promoted_vibelog_id uuid REFERENCES vibelogs(id) ON DELETE SET NULL;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS promoted_at timestamptz;

-- Engagement metrics
ALTER TABLE comments ADD COLUMN IF NOT EXISTS likes_count integer DEFAULT 0;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS replies_count integer DEFAULT 0;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS views_count integer DEFAULT 0;

-- SEO and discoverability
ALTER TABLE comments ADD COLUMN IF NOT EXISTS slug text UNIQUE;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS seo_title text;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS seo_description text;

-- Conversation intelligence
ALTER TABLE comments ADD COLUMN IF NOT EXISTS conversation_thread_id uuid;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS ai_summary text;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS conversation_context jsonb;

-- Moderation and safety
ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_flagged boolean DEFAULT false;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS flag_reason text;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS moderation_status text DEFAULT 'approved' CHECK (moderation_status IN ('approved', 'pending', 'rejected', 'auto_approved'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS comments_tier_idx ON comments(comment_tier);
CREATE INDEX IF NOT EXISTS comments_promoted_idx ON comments(promoted_vibelog_id) WHERE promoted_vibelog_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS comments_conversation_idx ON comments(conversation_thread_id) WHERE conversation_thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS comments_slug_idx ON comments(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS comments_video_status_idx ON comments(video_generation_status) WHERE video_generation_status != 'idle';
CREATE INDEX IF NOT EXISTS comments_moderation_idx ON comments(moderation_status) WHERE moderation_status != 'approved';
CREATE INDEX IF NOT EXISTS comments_flagged_idx ON comments(is_flagged) WHERE is_flagged = true;
CREATE INDEX IF NOT EXISTS comments_public_idx ON comments(is_public, slug) WHERE is_public = true AND slug IS NOT NULL;

-- ============================================================================
-- COMMENT REACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type text NOT NULL CHECK (reaction_type IN ('like', 'love', 'mind_blown', 'laughing', 'fire')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS comment_reactions_comment_idx ON comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS comment_reactions_user_idx ON comment_reactions(user_id);

-- RLS for comment_reactions
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comment_reactions_select_all" ON comment_reactions;
CREATE POLICY "comment_reactions_select_all" ON comment_reactions FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "comment_reactions_insert_authenticated" ON comment_reactions;
CREATE POLICY "comment_reactions_insert_authenticated" ON comment_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "comment_reactions_delete_own" ON comment_reactions;
CREATE POLICY "comment_reactions_delete_own" ON comment_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================================
-- CONVERSATION THREADS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversation_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  root_comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  vibelog_id uuid NOT NULL REFERENCES vibelogs(id) ON DELETE CASCADE,
  thread_title text,
  thread_summary text,
  primary_vibe text,
  participant_count integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  is_featured boolean DEFAULT false,
  slug text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conversation_threads_vibelog_idx ON conversation_threads(vibelog_id);
CREATE INDEX IF NOT EXISTS conversation_threads_root_idx ON conversation_threads(root_comment_id);
CREATE INDEX IF NOT EXISTS conversation_threads_featured_idx ON conversation_threads(is_featured) WHERE is_featured = true;

ALTER TABLE conversation_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversation_threads_select_all" ON conversation_threads;
CREATE POLICY "conversation_threads_select_all" ON conversation_threads FOR SELECT TO authenticated, anon USING (true);
