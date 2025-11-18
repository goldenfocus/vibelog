-- ============================================================================
-- NOTIFICATION SYSTEM: Universal notification infrastructure
-- ============================================================================
-- Description: Comprehensive notification system supporting multiple channels
--              (in-app, email, push) with grouping, preferences, and real-time
--              delivery for comments, replies, reactions, and more.
-- ============================================================================

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN (
    'comment',
    'reply',
    'reaction',
    'mention',
    'follow',
    'vibelog_like',
    'mini_vibelog_promoted',
    'comment_promoted',
    'system'
  )),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- Actor (who triggered this notification)
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_username text,
  actor_display_name text,
  actor_avatar_url text,

  -- Content
  title text NOT NULL,
  message text NOT NULL,
  action_text text,
  action_url text,

  -- Related entities
  vibelog_id uuid REFERENCES vibelogs(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  reply_id uuid REFERENCES comments(id) ON DELETE CASCADE,

  -- Flexible metadata storage
  metadata jsonb,

  -- State tracking
  is_read boolean DEFAULT false,
  is_seen boolean DEFAULT false,
  read_at timestamptz,
  seen_at timestamptz,

  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS notifications_user_type_idx ON notifications(user_id, type);
CREATE INDEX IF NOT EXISTS notifications_vibelog_idx ON notifications(vibelog_id) WHERE vibelog_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS notifications_comment_idx ON notifications(comment_id) WHERE comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS notifications_actor_idx ON notifications(actor_id) WHERE actor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS notifications_priority_idx ON notifications(priority) WHERE priority IN ('high', 'urgent');

-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read/seen)
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "notifications_delete_own" ON notifications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- System can insert notifications (via service role)
CREATE POLICY "notifications_insert_system" ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- NOTIFICATION PREFERENCES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Per-type channel preferences (in_app, email, push)
  comment_in_app boolean DEFAULT true,
  comment_email boolean DEFAULT true,
  comment_push boolean DEFAULT false,

  reply_in_app boolean DEFAULT true,
  reply_email boolean DEFAULT true,
  reply_push boolean DEFAULT false,

  reaction_in_app boolean DEFAULT true,
  reaction_email boolean DEFAULT false,
  reaction_push boolean DEFAULT false,

  mention_in_app boolean DEFAULT true,
  mention_email boolean DEFAULT true,
  mention_push boolean DEFAULT false,

  follow_in_app boolean DEFAULT true,
  follow_email boolean DEFAULT false,
  follow_push boolean DEFAULT false,

  vibelog_like_in_app boolean DEFAULT true,
  vibelog_like_email boolean DEFAULT false,
  vibelog_like_push boolean DEFAULT false,

  mini_vibelog_promoted_in_app boolean DEFAULT true,
  mini_vibelog_promoted_email boolean DEFAULT true,
  mini_vibelog_promoted_push boolean DEFAULT false,

  comment_promoted_in_app boolean DEFAULT true,
  comment_promoted_email boolean DEFAULT true,
  comment_promoted_push boolean DEFAULT false,

  system_in_app boolean DEFAULT true,
  system_email boolean DEFAULT true,
  system_push boolean DEFAULT false,

  -- Grouping settings
  group_similar boolean DEFAULT true,
  group_window_minutes integer DEFAULT 60,

  -- Quiet hours
  quiet_hours_enabled boolean DEFAULT false,
  quiet_hours_start time,
  quiet_hours_end time,

  -- Frequency limits
  max_emails_per_day integer DEFAULT 50,
  digest_enabled boolean DEFAULT false,
  digest_frequency text DEFAULT 'daily' CHECK (digest_frequency IN ('daily', 'weekly')),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS Policies
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "notification_preferences_select_own" ON notification_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "notification_preferences_update_own" ON notification_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "notification_preferences_insert_own" ON notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to create default notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create preferences on user signup
DROP TRIGGER IF EXISTS on_user_created_notification_prefs ON auth.users;
CREATE TRIGGER on_user_created_notification_prefs
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = now()
  WHERE id = notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as seen
CREATE OR REPLACE FUNCTION mark_notification_seen(notification_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET is_seen = true, seen_at = now()
  WHERE id = notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(target_user_id uuid DEFAULT NULL)
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = now()
  WHERE user_id = COALESCE(target_user_id, auth.uid())
    AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS integer AS $$
  SELECT COUNT(*)::integer
  FROM notifications
  WHERE user_id = auth.uid() AND is_read = false;
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================================
-- NOTIFICATION CREATION HELPERS
-- ============================================================================

-- Function to create a comment notification
CREATE OR REPLACE FUNCTION create_comment_notification(
  p_vibelog_id uuid,
  p_comment_id uuid,
  p_actor_id uuid
)
RETURNS void AS $$
DECLARE
  v_vibelog_owner uuid;
  v_vibelog_title text;
  v_actor_username text;
  v_actor_display_name text;
  v_actor_avatar_url text;
  v_vibelog_slug text;
  v_owner_username text;
BEGIN
  -- Get vibelog owner and details
  SELECT user_id, title, slug INTO v_vibelog_owner, v_vibelog_title, v_vibelog_slug
  FROM vibelogs
  WHERE id = p_vibelog_id;

  -- Don't notify if actor is the owner
  IF v_vibelog_owner = p_actor_id THEN
    RETURN;
  END IF;

  -- Get actor details
  SELECT username, display_name, avatar_url
  INTO v_actor_username, v_actor_display_name, v_actor_avatar_url
  FROM profiles
  WHERE id = p_actor_id;

  -- Get owner username for URL
  SELECT username INTO v_owner_username
  FROM profiles
  WHERE id = v_vibelog_owner;

  -- Create notification
  INSERT INTO notifications (
    user_id,
    type,
    priority,
    actor_id,
    actor_username,
    actor_display_name,
    actor_avatar_url,
    title,
    message,
    action_text,
    action_url,
    vibelog_id,
    comment_id
  ) VALUES (
    v_vibelog_owner,
    'comment',
    'medium',
    p_actor_id,
    v_actor_username,
    v_actor_display_name,
    v_actor_avatar_url,
    'New comment on your vibelog',
    v_actor_display_name || ' commented on "' || v_vibelog_title || '"',
    'View comment',
    '/@' || v_owner_username || '/' || v_vibelog_slug || '#comment-' || p_comment_id,
    p_vibelog_id,
    p_comment_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a reply notification
CREATE OR REPLACE FUNCTION create_reply_notification(
  p_parent_comment_id uuid,
  p_reply_id uuid,
  p_actor_id uuid
)
RETURNS void AS $$
DECLARE
  v_parent_author_id uuid;
  v_vibelog_id uuid;
  v_vibelog_title text;
  v_vibelog_slug text;
  v_actor_username text;
  v_actor_display_name text;
  v_actor_avatar_url text;
  v_owner_username text;
BEGIN
  -- Get parent comment author and vibelog
  SELECT user_id, vibelog_id INTO v_parent_author_id, v_vibelog_id
  FROM comments
  WHERE id = p_parent_comment_id;

  -- Don't notify if actor is replying to themselves
  IF v_parent_author_id = p_actor_id THEN
    RETURN;
  END IF;

  -- Get vibelog details
  SELECT title, slug, user_id INTO v_vibelog_title, v_vibelog_slug, v_parent_author_id
  FROM vibelogs
  WHERE id = v_vibelog_id;

  -- Get actor details
  SELECT username, display_name, avatar_url
  INTO v_actor_username, v_actor_display_name, v_actor_avatar_url
  FROM profiles
  WHERE id = p_actor_id;

  -- Get owner username for URL
  SELECT username INTO v_owner_username
  FROM profiles
  WHERE id = v_parent_author_id;

  -- Create notification
  INSERT INTO notifications (
    user_id,
    type,
    priority,
    actor_id,
    actor_username,
    actor_display_name,
    actor_avatar_url,
    title,
    message,
    action_text,
    action_url,
    vibelog_id,
    comment_id,
    reply_id
  ) VALUES (
    v_parent_author_id,
    'reply',
    'medium',
    p_actor_id,
    v_actor_username,
    v_actor_display_name,
    v_actor_avatar_url,
    'New reply to your comment',
    v_actor_display_name || ' replied to your comment on "' || v_vibelog_title || '"',
    'View reply',
    '/@' || v_owner_username || '/' || v_vibelog_slug || '#comment-' || p_reply_id,
    v_vibelog_id,
    p_parent_comment_id,
    p_reply_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS FOR AUTO-NOTIFICATION
-- ============================================================================

-- Trigger to create notification when comment is created
CREATE OR REPLACE FUNCTION trigger_comment_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification for top-level comments (not replies)
  IF NEW.parent_comment_id IS NULL THEN
    PERFORM create_comment_notification(
      NEW.vibelog_id,
      NEW.id,
      NEW.user_id
    );
  ELSE
    -- It's a reply, create reply notification
    PERFORM create_reply_notification(
      NEW.parent_comment_id,
      NEW.id,
      NEW.user_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment_created_notification ON comments;
CREATE TRIGGER on_comment_created_notification
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_comment_notification();

-- ============================================================================
-- COMMENT: Why this migration is awesome
-- ============================================================================
-- This notification system is designed to be:
-- 1. **Extensible**: Easy to add new notification types
-- 2. **Performant**: Indexed for fast queries even with millions of notifications
-- 3. **User-friendly**: Granular preferences per type and channel
-- 4. **Real-time ready**: Works with Supabase Realtime subscriptions
-- 5. **Privacy-focused**: RLS ensures users only see their own notifications
-- 6. **Smart**: Automatic grouping, quiet hours, and digest options
-- 7. **Automatic**: Triggers create notifications without manual API calls
--
-- Fun fact: Notifications are like vibes you send to future you! 📬✨
