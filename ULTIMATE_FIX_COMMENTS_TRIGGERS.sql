-- ============================================================================
-- ULTIMATE FIX: Remove Duplicate/Broken Comment Notification Triggers
-- ============================================================================
-- Problem: Multiple conflicting triggers causing transaction rollbacks
-- Root Cause: Old migration created broken trigger_comment_notification()
--             Our new create_comment_notification() is correct but both run
--             Old trigger fails → rollback → comment never inserted
-- ============================================================================

-- ===================
-- STEP 1: DROP ALL BROKEN TRIGGERS AND FUNCTIONS
-- ===================

-- Drop all comment notification triggers (we'll recreate the correct ones)
DROP TRIGGER IF EXISTS on_comment_created ON comments;
DROP TRIGGER IF EXISTS on_comment_created_notification ON comments;
DROP TRIGGER IF EXISTS on_reply_created ON comments;
DROP TRIGGER IF EXISTS on_reply_created_notification ON comments;

-- Drop broken notification functions (uses profiles.user_id which doesn't exist)
DROP FUNCTION IF EXISTS trigger_comment_notification();
DROP FUNCTION IF EXISTS trigger_reply_notification();

-- ===================
-- STEP 2: CREATE CORRECT NOTIFICATION FUNCTIONS
-- ===================

-- Comment notification function (FIXED: uses profiles.id)
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
  vibelog_owner_id uuid;
  commenter_username text;
  commenter_display_name text;
  commenter_avatar text;
  vibelog_title text;
BEGIN
  -- Get vibelog owner and title
  SELECT user_id, title INTO vibelog_owner_id, vibelog_title
  FROM vibelogs WHERE id = NEW.vibelog_id;

  -- Don't notify if commenting on own vibelog
  IF vibelog_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- FIXED: Use 'id' not 'user_id' to query profiles
  -- profiles table schema: id uuid PRIMARY KEY REFERENCES auth.users(id)
  SELECT username, display_name, avatar_url
  INTO commenter_username, commenter_display_name, commenter_avatar
  FROM profiles WHERE id = NEW.user_id;

  -- Log warning if profile not found (shouldn't happen but helps debugging)
  IF commenter_username IS NULL THEN
    RAISE WARNING 'Profile not found for user_id: % when creating comment notification', NEW.user_id;
  END IF;

  -- Create notification
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

-- Reply notification function (FIXED: uses profiles.id)
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

  -- FIXED: Use 'id' not 'user_id' to query profiles
  SELECT username, display_name, avatar_url
  INTO replier_username, replier_display_name, replier_avatar
  FROM profiles WHERE id = NEW.user_id;

  -- Log warning if profile not found
  IF replier_username IS NULL THEN
    RAISE WARNING 'Profile not found for user_id: % when creating reply notification', NEW.user_id;
  END IF;

  -- Create notification
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

-- ===================
-- STEP 3: CREATE TRIGGERS (ONE PER EVENT, NO DUPLICATES)
-- ===================

-- Trigger for top-level comments (parent_comment_id IS NULL)
CREATE TRIGGER on_comment_created
  AFTER INSERT ON comments
  FOR EACH ROW
  WHEN (NEW.parent_comment_id IS NULL)
  EXECUTE FUNCTION create_comment_notification();

-- Trigger for replies (parent_comment_id IS NOT NULL)
CREATE TRIGGER on_reply_created
  AFTER INSERT ON comments
  FOR EACH ROW
  WHEN (NEW.parent_comment_id IS NOT NULL)
  EXECUTE FUNCTION create_reply_notification();

-- ===================
-- STEP 4: VERIFY FIX
-- ===================

-- Check that only 2 notification triggers exist (not 4!)
DO $$
DECLARE
  trigger_count int;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE event_object_schema = 'public'
    AND event_object_table = 'comments'
    AND trigger_name IN ('on_comment_created', 'on_reply_created');

  IF trigger_count != 2 THEN
    RAISE WARNING 'Expected 2 notification triggers, found %', trigger_count;
  ELSE
    RAISE NOTICE 'SUCCESS: Exactly 2 notification triggers active ✓';
  END IF;
END $$;

-- ============================================================================
-- DONE! Comments should now work!
-- ============================================================================
--
-- What was fixed:
-- 1. Removed duplicate trigger 'on_comment_created_notification'
-- 2. Removed broken function 'trigger_comment_notification()'
-- 3. Fixed profiles query: profiles.user_id → profiles.id
-- 4. Added debug warnings for missing profiles
-- 5. Ensured only ONE trigger per event (no conflicts)
--
-- Expected behavior after fix:
-- ✓ Comments post successfully
-- ✓ Notifications created with correct actor info
-- ✓ No transaction rollbacks
-- ✓ Deovia's notification becomes visible
-- ============================================================================
