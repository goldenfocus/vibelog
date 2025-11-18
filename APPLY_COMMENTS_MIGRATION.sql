-- ============================================================================
-- COMPREHENSIVE COMMENTS + NOTIFICATIONS MIGRATION
-- ============================================================================
-- This migration includes ALL necessary changes for the comments system
-- Run this file directly in Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE COMMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vibelog_id uuid NOT NULL REFERENCES public.vibelogs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Comment content
  content text, -- Text content (optional if audio_url is provided)
  audio_url text, -- URL to audio file for voice comments
  voice_id text, -- Voice clone ID used for TTS

  -- Enhanced features (mini vibelogs)
  enhanced_content text,
  enhanced_title text,
  enhanced_audio_url text,
  enhanced_cover_url text,
  enhanced_vibe_scores jsonb,
  enhanced_primary_vibe text,
  processing_status text DEFAULT 'idle' CHECK (processing_status IN ('idle', 'processing', 'completed', 'failed')),
  processing_error text,
  is_mini_vibelog boolean DEFAULT false,

  -- Threading
  parent_comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  thread_position integer DEFAULT 0,

  -- Video support
  video_url text,
  video_thumbnail_url text,
  video_generation_status text DEFAULT 'idle' CHECK (video_generation_status IN ('idle', 'generating', 'completed', 'failed')),
  video_generated_at timestamptz,

  -- Tier system (1=Simple, 2=Mini-Vibelog, 3=Promoted)
  comment_tier integer DEFAULT 1 CHECK (comment_tier IN (1, 2, 3)),

  -- Promotion
  promoted_vibelog_id uuid REFERENCES public.vibelogs(id) ON DELETE SET NULL,
  promoted_at timestamptz,

  -- Engagement
  likes_count integer DEFAULT 0,
  replies_count integer DEFAULT 0,
  views_count integer DEFAULT 0,

  -- SEO and discoverability
  slug text UNIQUE,
  is_public boolean DEFAULT true,
  seo_title text,
  seo_description text,

  -- Conversation intelligence
  conversation_thread_id uuid,
  ai_summary text,
  conversation_context jsonb,

  -- Moderation
  is_flagged boolean DEFAULT false,
  flag_reason text,
  moderation_status text DEFAULT 'approved' CHECK (moderation_status IN ('approved', 'pending', 'rejected', 'auto_approved')),

  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- STEP 2: CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS comments_vibelog_id_idx ON public.comments (vibelog_id);
CREATE INDEX IF NOT EXISTS comments_user_id_idx ON public.comments (user_id);
CREATE INDEX IF NOT EXISTS comments_created_at_idx ON public.comments (created_at);
CREATE INDEX IF NOT EXISTS comments_mini_vibelog_idx ON public.comments (vibelog_id, is_mini_vibelog) WHERE is_mini_vibelog = true;
CREATE INDEX IF NOT EXISTS comments_parent_idx ON public.comments (parent_comment_id) WHERE parent_comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS comments_processing_idx ON public.comments (processing_status);
CREATE INDEX IF NOT EXISTS comments_tier_idx ON public.comments(comment_tier);
CREATE INDEX IF NOT EXISTS comments_promoted_idx ON public.comments(promoted_vibelog_id) WHERE promoted_vibelog_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS comments_conversation_idx ON public.comments(conversation_thread_id) WHERE conversation_thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS comments_slug_idx ON public.comments(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS comments_video_status_idx ON public.comments(video_generation_status) WHERE video_generation_status != 'idle';
CREATE INDEX IF NOT EXISTS comments_moderation_idx ON public.comments(moderation_status) WHERE moderation_status != 'approved';
CREATE INDEX IF NOT EXISTS comments_flagged_idx ON public.comments(is_flagged) WHERE is_flagged = true;
CREATE INDEX IF NOT EXISTS comments_public_idx ON public.comments(is_public, slug) WHERE is_public = true AND slug IS NOT NULL;

-- ============================================================================
-- STEP 3: ENABLE RLS
-- ============================================================================

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "comments select public or own" ON public.comments;
DROP POLICY IF EXISTS "comments insert authenticated" ON public.comments;
DROP POLICY IF EXISTS "comments update own" ON public.comments;
DROP POLICY IF EXISTS "comments delete own" ON public.comments;

-- Create RLS policies
CREATE POLICY "comments select public or own" ON public.comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.vibelogs
      WHERE vibelogs.id = comments.vibelog_id
        AND (
          (vibelogs.is_published = true AND vibelogs.is_public = true)
          OR vibelogs.user_id = auth.uid()
          OR comments.user_id = auth.uid()
        )
    )
  );

CREATE POLICY "comments insert authenticated" ON public.comments
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.vibelogs
      WHERE vibelogs.id = comments.vibelog_id
        AND (
          vibelogs.is_published = true
          OR vibelogs.user_id = auth.uid()
        )
    )
  );

CREATE POLICY "comments update own" ON public.comments
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comments delete own" ON public.comments
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 4: CREATE RELATED TABLES
-- ============================================================================

-- Comment Reactions Table
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

ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comment_reactions_select_all" ON comment_reactions;
DROP POLICY IF EXISTS "comment_reactions_insert_authenticated" ON comment_reactions;
DROP POLICY IF EXISTS "comment_reactions_delete_own" ON comment_reactions;

CREATE POLICY "comment_reactions_select_all" ON comment_reactions FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "comment_reactions_insert_authenticated" ON comment_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comment_reactions_delete_own" ON comment_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Conversation Threads Table
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

-- ============================================================================
-- STEP 5: CREATE NOTIFICATIONS TABLE (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Notification type and priority
  type text NOT NULL CHECK (type IN ('comment', 'reply', 'like', 'mention', 'follow', 'system')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  -- Actor information (who triggered this notification)
  actor_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_username text,
  actor_display_name text,
  actor_avatar_url text,

  -- Notification content
  title text NOT NULL,
  message text NOT NULL,
  action_text text,
  action_url text,

  -- Related entities
  vibelog_id uuid REFERENCES public.vibelogs(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  reply_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,

  -- Status
  is_read boolean DEFAULT false,
  is_archived boolean DEFAULT false,
  read_at timestamptz,

  -- Additional data
  metadata jsonb,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON public.notifications (is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS notifications_type_idx ON public.notifications (type);
CREATE INDEX IF NOT EXISTS notifications_priority_idx ON public.notifications (priority);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;

CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- STEP 6: CREATE NOTIFICATION TRIGGER FUNCTIONS
-- ============================================================================

-- Function to create notification when someone comments on your vibelog
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
  vibelog_owner_id uuid;
  commenter_username text;
  commenter_display_name text;
  commenter_avatar text;
  vibelog_title text;
BEGIN
  SELECT user_id, title INTO vibelog_owner_id, vibelog_title
  FROM vibelogs WHERE id = NEW.vibelog_id;

  -- Don't notify if commenting on own vibelog
  IF vibelog_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT username, display_name, avatar_url
  INTO commenter_username, commenter_display_name, commenter_avatar
  FROM profiles WHERE user_id = NEW.user_id;

  INSERT INTO notifications (
    user_id, type, priority,
    actor_id, actor_username, actor_display_name, actor_avatar_url,
    title, message, action_text, action_url,
    vibelog_id, comment_id, metadata
  ) VALUES (
    vibelog_owner_id, 'comment', 'normal',
    NEW.user_id, commenter_username, commenter_display_name, commenter_avatar,
    'New comment on your vibelog',
    format('%s commented: "%s"',
      COALESCE(commenter_display_name, commenter_username, 'Someone'),
      LEFT(COALESCE(NEW.content, 'Voice comment'), 100)
    ),
    'View comment',
    format('/v/%s#comment-%s', NEW.vibelog_id, NEW.id),
    NEW.vibelog_id, NEW.id,
    jsonb_build_object(
      'vibelog_title', vibelog_title,
      'comment_has_audio', NEW.audio_url IS NOT NULL
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification when someone replies to your comment
CREATE OR REPLACE FUNCTION create_reply_notification()
RETURNS TRIGGER AS $$
DECLARE
  parent_comment_owner_id uuid;
  replier_username text;
  replier_display_name text;
  replier_avatar text;
BEGIN
  -- Get parent comment owner
  SELECT user_id INTO parent_comment_owner_id
  FROM comments WHERE id = NEW.parent_comment_id;

  -- Don't notify if replying to own comment
  IF parent_comment_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT username, display_name, avatar_url
  INTO replier_username, replier_display_name, replier_avatar
  FROM profiles WHERE user_id = NEW.user_id;

  INSERT INTO notifications (
    user_id, type, priority,
    actor_id, actor_username, actor_display_name, actor_avatar_url,
    title, message, action_text, action_url,
    vibelog_id, comment_id, reply_id, metadata
  ) VALUES (
    parent_comment_owner_id, 'reply', 'high',
    NEW.user_id, replier_username, replier_display_name, replier_avatar,
    'New reply to your comment',
    format('%s replied: "%s"',
      COALESCE(replier_display_name, replier_username, 'Someone'),
      LEFT(COALESCE(NEW.content, 'Voice reply'), 100)
    ),
    'View reply',
    format('/v/%s#comment-%s', NEW.vibelog_id, NEW.id),
    NEW.vibelog_id, NEW.parent_comment_id, NEW.id,
    jsonb_build_object('reply_has_audio', NEW.audio_url IS NOT NULL)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 7: CREATE TRIGGERS
-- ============================================================================

-- Drop existing triggers
DROP TRIGGER IF EXISTS on_comment_created ON comments;
DROP TRIGGER IF EXISTS on_reply_created ON comments;
DROP TRIGGER IF EXISTS set_comments_updated_at ON comments;

-- Trigger for new comments
CREATE TRIGGER on_comment_created
  AFTER INSERT ON comments
  FOR EACH ROW
  WHEN (NEW.parent_comment_id IS NULL)
  EXECUTE FUNCTION create_comment_notification();

-- Trigger for replies
CREATE TRIGGER on_reply_created
  AFTER INSERT ON comments
  FOR EACH ROW
  WHEN (NEW.parent_comment_id IS NOT NULL)
  EXECUTE FUNCTION create_reply_notification();

-- Trigger to update updated_at
CREATE TRIGGER set_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- DONE! Comments system is now ready
-- ============================================================================
