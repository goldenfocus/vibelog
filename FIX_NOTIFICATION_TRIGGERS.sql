-- ============================================================================
-- HOTFIX: Fix Notification Triggers - profiles.user_id → profiles.id
-- ============================================================================
-- Run this in Supabase SQL Editor to fix comment posting
-- ============================================================================

-- Drop existing broken triggers
DROP TRIGGER IF EXISTS on_comment_created ON comments;
DROP TRIGGER IF EXISTS on_reply_created ON comments;

-- Fix comment notification function
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

  -- FIXED: Changed FROM profiles WHERE user_id = NEW.user_id
  --     TO: FROM profiles WHERE id = NEW.user_id
  SELECT username, display_name, avatar_url
  INTO commenter_username, commenter_display_name, commenter_avatar
  FROM profiles WHERE id = NEW.user_id;

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

-- Fix reply notification function
CREATE OR REPLACE FUNCTION create_reply_notification()
RETURNS TRIGGER AS $$
DECLARE
  parent_comment_owner_id uuid;
  replier_username text;
  replier_display_name text;
  replier_avatar text;
BEGIN
  SELECT user_id INTO parent_comment_owner_id
  FROM comments WHERE id = NEW.parent_comment_id;

  -- Don't notify if replying to own comment
  IF parent_comment_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- FIXED: Changed FROM profiles WHERE user_id = NEW.user_id
  --     TO: FROM profiles WHERE id = NEW.user_id
  SELECT username, display_name, avatar_url
  INTO replier_username, replier_display_name, replier_avatar
  FROM profiles WHERE id = NEW.user_id;

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

-- Recreate triggers
CREATE TRIGGER on_comment_created
  AFTER INSERT ON comments
  FOR EACH ROW
  WHEN (NEW.parent_comment_id IS NULL)
  EXECUTE FUNCTION create_comment_notification();

CREATE TRIGGER on_reply_created
  AFTER INSERT ON comments
  FOR EACH ROW
  WHEN (NEW.parent_comment_id IS NOT NULL)
  EXECUTE FUNCTION create_reply_notification();

-- ============================================================================
-- DONE! Comments and notifications should now work!
-- ============================================================================
