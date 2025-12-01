-- Fix notify_new_message trigger function
-- Issues fixed:
-- 1. Changed 'messages' column to 'vibe_thread_message_in_app' (correct column name)
-- 2. Changed 'data' column to 'metadata' (correct column name in notifications table)

CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  participant RECORD;
  notification_prefs RECORD;
BEGIN
  -- For each participant (except sender)
  FOR participant IN
    SELECT user_id, is_muted, notifications_enabled
    FROM conversation_participants
    WHERE conversation_id = NEW.conversation_id
      AND user_id != NEW.sender_id
  LOOP
    -- Check if user wants notifications for this conversation
    IF participant.notifications_enabled AND NOT participant.is_muted THEN
      -- Check user's global notification preferences
      SELECT * INTO notification_prefs
      FROM notification_preferences
      WHERE user_id = participant.user_id;

      -- Create notification if user has messages enabled (use correct column name)
      IF notification_prefs.vibe_thread_message_in_app IS NULL OR notification_prefs.vibe_thread_message_in_app THEN
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          action_url,
          metadata
        ) VALUES (
          participant.user_id,
          'message',
          'New message',
          COALESCE(NEW.content, '🎤 Voice message'),
          '/messages/' || NEW.conversation_id,
          jsonb_build_object(
            'conversation_id', NEW.conversation_id,
            'message_id', NEW.id,
            'sender_id', NEW.sender_id
          )
        );
      END IF;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_notify_new_message ON messages;
CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION notify_new_message();

COMMENT ON FUNCTION notify_new_message IS 'Send notification to all participants when new message arrives (fixed)';
