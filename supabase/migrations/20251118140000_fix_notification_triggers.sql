-- Fix notification triggers to use correct column name
-- Why did the trigger fail? Because it was looking for parent_id when the real name was parent_comment_id!
-- It's like calling someone by the wrong name at a party - awkward! 😅

-- Drop existing triggers
DROP TRIGGER IF EXISTS on_comment_created ON comments;
DROP TRIGGER IF EXISTS on_reply_created ON comments;

-- Recreate comment notification function (no changes needed, already correct)
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

  SELECT username, full_name, avatar_url
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

-- Recreate reply notification function with CORRECT column name
CREATE OR REPLACE FUNCTION create_reply_notification()
RETURNS TRIGGER AS $$
DECLARE
  parent_comment_owner_id uuid;
  replier_username text;
  replier_display_name text;
  replier_avatar text;
BEGIN
  -- Get parent comment owner using CORRECT column name
  SELECT user_id INTO parent_comment_owner_id
  FROM comments WHERE id = NEW.parent_comment_id; -- FIXED: was parent_id

  -- Don't notify if replying to own comment
  IF parent_comment_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT username, full_name, avatar_url
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
    NEW.vibelog_id, NEW.parent_comment_id, NEW.id, -- FIXED: was parent_id
    jsonb_build_object('reply_has_audio', NEW.audio_url IS NOT NULL)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate triggers with CORRECT column check
CREATE TRIGGER on_comment_created
  AFTER INSERT ON comments
  FOR EACH ROW
  WHEN (NEW.parent_comment_id IS NULL) -- FIXED: was parent_id
  EXECUTE FUNCTION create_comment_notification();

CREATE TRIGGER on_reply_created
  AFTER INSERT ON comments
  FOR EACH ROW
  WHEN (NEW.parent_comment_id IS NOT NULL) -- FIXED: was parent_id
  EXECUTE FUNCTION create_reply_notification();

-- ============================================================================
-- ALL FIXED! 🎉
-- ============================================================================
-- Now notifications will actually work! The triggers know the real column name! 🔔
-- ============================================================================
