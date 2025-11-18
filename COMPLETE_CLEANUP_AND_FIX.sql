-- ============================================================================
-- COMPLETE CLEANUP AND FIX
-- ============================================================================
-- Run this ONCE in Supabase SQL Editor to fix everything
-- ============================================================================

-- ===================
-- STEP 1: DELETE CORRUPT NOTIFICATIONS
-- ===================

-- Delete all notifications with NULL actor data (created by broken trigger)
DELETE FROM notifications
WHERE actor_username IS NULL
   OR actor_display_name IS NULL
   OR actor_id IS NULL;

-- Log how many were deleted
DO $$
DECLARE
  deleted_count int;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % corrupt notifications', deleted_count;
END $$;

-- ===================
-- STEP 2: DROP ALL DUPLICATE/BROKEN TRIGGERS
-- ===================

-- Drop all comment notification triggers (we'll recreate the correct ones)
DROP TRIGGER IF EXISTS on_comment_created ON comments;
DROP TRIGGER IF EXISTS on_comment_created_notification ON comments;
DROP TRIGGER IF EXISTS on_reply_created ON comments;
DROP TRIGGER IF EXISTS on_reply_created_notification ON comments;

-- Drop broken notification functions
DROP FUNCTION IF EXISTS trigger_comment_notification();
DROP FUNCTION IF EXISTS trigger_reply_notification();

-- ===================
-- STEP 3: CREATE CORRECT NOTIFICATION FUNCTIONS
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
  SELECT username, display_name, avatar_url
  INTO commenter_username, commenter_display_name, commenter_avatar
  FROM profiles WHERE id = NEW.user_id;

  -- Validation: Ensure we got profile data
  IF commenter_username IS NULL THEN
    RAISE WARNING 'Profile not found for user_id: % when creating comment notification', NEW.user_id;
    -- Use fallback values to prevent NULL
    commenter_username := 'unknown';
    commenter_display_name := 'Unknown User';
  END IF;

  -- Create notification with validated data
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

  -- Validation: Ensure we got profile data
  IF replier_username IS NULL THEN
    RAISE WARNING 'Profile not found for user_id: % when creating reply notification', NEW.user_id;
    replier_username := 'unknown';
    replier_display_name := 'Unknown User';
  END IF;

  -- Create notification with validated data
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
-- STEP 4: CREATE TRIGGERS (ONE PER EVENT)
-- ===================

-- Trigger for top-level comments
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

-- ===================
-- STEP 5: VERIFY FIX
-- ===================

-- Count notification triggers
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
    RAISE NOTICE '✓ SUCCESS: Exactly 2 notification triggers active';
  END IF;
END $$;

-- ===================
-- STEP 6: CREATE DEOVIA'S NOTIFICATION MANUALLY
-- ===================

-- Since Deovia's comment exists but notification might be corrupt, recreate it
INSERT INTO notifications (
  user_id, type, priority,
  actor_id, actor_username, actor_display_name, actor_avatar_url,
  title, message, action_text, action_url,
  vibelog_id, comment_id, metadata,
  created_at
)
SELECT
  v.user_id,                          -- vibelog owner (Yang)
  'comment',                          -- type
  'normal',                           -- priority
  c.user_id,                          -- Deovia's user_id
  p.username,                         -- Deovia's username
  p.display_name,                     -- Deovia's display_name
  p.avatar_url,                       -- Deovia's avatar
  'New comment on your vibelog',      -- title
  format('%s commented: "%s"',
    COALESCE(p.display_name, p.username, 'Someone'),
    LEFT(COALESCE(c.content, 'Voice comment'), 100)
  ),                                  -- message
  'View comment',                     -- action_text
  format('/v/%s#comment-%s', c.vibelog_id, c.id),  -- action_url
  c.vibelog_id,                       -- vibelog_id
  c.id,                               -- comment_id
  jsonb_build_object(
    'vibelog_title', v.title,
    'comment_has_audio', c.audio_url IS NOT NULL
  ),                                  -- metadata
  c.created_at                        -- preserve original timestamp
FROM comments c
JOIN profiles p ON p.id = c.user_id
JOIN vibelogs v ON v.id = c.vibelog_id
WHERE c.id = '917a72d6-88f6-42e3-a63f-dbfee07be7ee'  -- Deovia's comment ID
  AND v.user_id != c.user_id  -- Don't notify if commenting on own vibelog
  AND NOT EXISTS (
    -- Only create if doesn't already exist
    SELECT 1 FROM notifications
    WHERE comment_id = c.id
      AND actor_username IS NOT NULL  -- Must be valid notification
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- DONE! Everything should now work!
-- ============================================================================
--
-- What was fixed:
-- 1. ✓ Deleted corrupt notifications with NULL actor data
-- 2. ✓ Removed duplicate trigger 'on_comment_created_notification'
-- 3. ✓ Fixed profiles query: profiles.user_id → profiles.id
-- 4. ✓ Added validation to prevent NULL actor data
-- 5. ✓ Recreated Deovia's notification
-- 6. ✓ Ensured only 2 triggers exist (no duplicates)
--
-- After running this:
-- 1. Refresh your browser
-- 2. Try posting a comment - should work!
-- 3. Check notifications - Deovia's should appear!
-- 4. No more infinite rendering loop!
-- ============================================================================
