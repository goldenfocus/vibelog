-- =====================================================
-- VIBELOG MESSAGING SYSTEM - MOBILE-FIRST ARCHITECTURE (IDEMPOTENT)
-- =====================================================
-- Created: 2025-11-25
-- Description: Voice-first, mobile-native messaging with real-time features
-- Features: DMs, group chats, voice/video/text messages, typing indicators,
--           read receipts, presence tracking, follows system
--
-- IDEMPOTENT: Safe to run multiple times, handles existing objects
-- =====================================================

-- =====================================================
-- 1. CONVERSATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('dm', 'group')) DEFAULT 'dm',

  -- Group metadata (null for DMs)
  title TEXT,
  description TEXT,
  avatar_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Smart features
  ai_summary TEXT, -- AI-generated: "Discussing weekend plans and music"
  last_message_id UUID,
  last_message_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP INDEX IF EXISTS idx_conversations_updated;
CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);

DROP INDEX IF EXISTS idx_conversations_last_message;
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC NULLS LAST);

DROP INDEX IF EXISTS idx_conversations_type;
CREATE INDEX idx_conversations_type ON conversations(type);

COMMENT ON TABLE conversations IS 'User-to-user conversations (DMs and groups)';
COMMENT ON COLUMN conversations.ai_summary IS 'AI-generated summary of conversation topic';

-- =====================================================
-- 2. CONVERSATION PARTICIPANTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Participant state
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_message_id UUID, -- References messages(id), added after messages table
  last_read_at TIMESTAMPTZ,

  -- Preferences
  is_muted BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  notifications_enabled BOOLEAN DEFAULT true,

  -- Typing indicator (ephemeral, updated in real-time)
  is_typing BOOLEAN DEFAULT false,
  typing_updated_at TIMESTAMPTZ,

  PRIMARY KEY(conversation_id, user_id)
);

DROP INDEX IF EXISTS idx_participants_user;
CREATE INDEX idx_participants_user ON conversation_participants(user_id, last_read_at DESC);

DROP INDEX IF EXISTS idx_participants_conv;
CREATE INDEX idx_participants_conv ON conversation_participants(conversation_id);

DROP INDEX IF EXISTS idx_participants_typing;
CREATE INDEX idx_participants_typing ON conversation_participants(is_typing, typing_updated_at)
  WHERE is_typing = true;

COMMENT ON TABLE conversation_participants IS 'Many-to-many relationship between users and conversations';
COMMENT ON COLUMN conversation_participants.is_typing IS 'Ephemeral typing indicator, auto-clears after 3s';

-- =====================================================
-- 3. MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Content (multi-modal: any or all can be set)
  content TEXT, -- Text message
  audio_url TEXT, -- Voice message
  audio_duration INTEGER, -- Milliseconds
  video_url TEXT, -- Video message
  attachments JSONB DEFAULT '[]'::jsonb, -- Array of MediaAttachment objects

  -- AI enhancement (optional, computed asynchronously)
  transcript TEXT, -- Whisper auto-transcription of audio
  ai_enhanced_content TEXT, -- GPT-4o polished version
  ai_summary TEXT, -- For long voice messages: "Discussion about..."
  vibe_scores JSONB, -- Emotion analysis from vibe engine
  primary_vibe TEXT, -- Dominant emotion

  -- Threading (reply to specific message)
  reply_to_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,

  -- State
  is_deleted BOOLEAN DEFAULT false,
  deleted_for_everyone BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP INDEX IF EXISTS idx_messages_conversation;
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);

DROP INDEX IF EXISTS idx_messages_sender;
CREATE INDEX idx_messages_sender ON messages(sender_id, created_at DESC);

DROP INDEX IF EXISTS idx_messages_reply;
CREATE INDEX idx_messages_reply ON messages(reply_to_message_id) WHERE reply_to_message_id IS NOT NULL;

COMMENT ON TABLE messages IS 'All message types: text, voice, video, mixed media';
COMMENT ON COLUMN messages.vibe_scores IS 'JSON: {joy: 0.8, curiosity: 0.6, ...} from vibe engine';

-- =====================================================
-- 4. MESSAGE READS TABLE (Read Receipts)
-- =====================================================
CREATE TABLE IF NOT EXISTS message_reads (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY(message_id, user_id)
);

DROP INDEX IF EXISTS idx_message_reads_user;
CREATE INDEX idx_message_reads_user ON message_reads(user_id, read_at DESC);

DROP INDEX IF EXISTS idx_message_reads_message;
CREATE INDEX idx_message_reads_message ON message_reads(message_id);

COMMENT ON TABLE message_reads IS 'WhatsApp-style read receipts (blue checkmarks)';

-- =====================================================
-- 5. FOLLOWS SYSTEM (Social Graph)
-- =====================================================
CREATE TABLE IF NOT EXISTS follows (
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY(follower_id, following_id),
  CHECK (follower_id != following_id) -- Can't follow yourself
);

DROP INDEX IF EXISTS idx_follows_follower;
CREATE INDEX idx_follows_follower ON follows(follower_id, created_at DESC);

DROP INDEX IF EXISTS idx_follows_following;
CREATE INDEX idx_follows_following ON follows(following_id, created_at DESC);

COMMENT ON TABLE follows IS 'User follow relationships (Twitter-style)';

-- =====================================================
-- 6. USER PRESENCE (Online/Offline Status)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('online', 'away', 'offline')) DEFAULT 'offline',
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP INDEX IF EXISTS idx_presence_status;
CREATE INDEX idx_presence_status ON user_presence(status, last_seen_at DESC);

COMMENT ON TABLE user_presence IS 'Real-time user online/offline status';

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Generic updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-update updated_at timestamps
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_presence_updated_at ON user_presence;
CREATE TRIGGER update_user_presence_updated_at
  BEFORE UPDATE ON user_presence
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update conversation.last_message_at when new message is sent
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET
    last_message_id = NEW.id,
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON messages;
CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- Sync message_reads with conversation_participants.last_read_at
CREATE OR REPLACE FUNCTION sync_participant_last_read()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversation_participants
  SET
    last_read_message_id = NEW.message_id,
    last_read_at = NEW.read_at
  WHERE
    conversation_id = (SELECT conversation_id FROM messages WHERE id = NEW.message_id)
    AND user_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_participant_last_read ON message_reads;
CREATE TRIGGER trigger_sync_participant_last_read
  AFTER INSERT ON message_reads
  FOR EACH ROW EXECUTE FUNCTION sync_participant_last_read();

-- Maintain follower counts in profiles table
CREATE OR REPLACE FUNCTION update_follower_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment following_count for follower
    UPDATE profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    -- Increment follower_count for following
    UPDATE profiles SET follower_count = follower_count + 1 WHERE id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement following_count for follower
    UPDATE profiles SET following_count = following_count - 1 WHERE id = OLD.follower_id;
    -- Decrement follower_count for following
    UPDATE profiles SET follower_count = follower_count - 1 WHERE id = OLD.following_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_follower_counts ON follows;
CREATE TRIGGER trigger_update_follower_counts
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION update_follower_counts();

-- Send notification when new message arrives
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

      -- Create notification if user has messages enabled
      IF notification_prefs.messages THEN
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          action_url,
          data
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

DROP TRIGGER IF EXISTS trigger_notify_new_message ON messages;
CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION notify_new_message();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get or create DM conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_dm(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
  conversation_id UUID;
BEGIN
  -- Check if DM already exists (bidirectional check)
  SELECT c.id INTO conversation_id
  FROM conversations c
  INNER JOIN conversation_participants p1 ON c.id = p1.conversation_id
  INNER JOIN conversation_participants p2 ON c.id = p2.conversation_id
  WHERE c.type = 'dm'
    AND p1.user_id = user1_id
    AND p2.user_id = user2_id;

  -- If not found, create new DM
  IF conversation_id IS NULL THEN
    INSERT INTO conversations (type) VALUES ('dm') RETURNING id INTO conversation_id;

    -- Add both participants
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES
      (conversation_id, user1_id),
      (conversation_id, user2_id);
  END IF;

  RETURN conversation_id;
END;
$$ LANGUAGE plpgsql;

-- Get unread message count for user across all conversations
CREATE OR REPLACE FUNCTION get_unread_count(p_user_id UUID)
RETURNS TABLE(conversation_id UUID, unread_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.conversation_id,
    COUNT(*)::BIGINT AS unread_count
  FROM messages m
  INNER JOIN conversation_participants cp
    ON m.conversation_id = cp.conversation_id
    AND cp.user_id = p_user_id
  LEFT JOIN message_reads mr
    ON m.id = mr.message_id
    AND mr.user_id = p_user_id
  WHERE
    m.sender_id != p_user_id -- Don't count own messages
    AND mr.message_id IS NULL -- Not read
    AND m.created_at > cp.last_read_at -- Newer than last known read
  GROUP BY m.conversation_id;
END;
$$ LANGUAGE plpgsql;

-- Mark all messages in conversation as read
CREATE OR REPLACE FUNCTION mark_conversation_read(p_conversation_id UUID, p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Insert read receipts for all unread messages
  INSERT INTO message_reads (message_id, user_id, read_at)
  SELECT m.id, p_user_id, NOW()
  FROM messages m
  LEFT JOIN message_reads mr ON m.id = mr.message_id AND mr.user_id = p_user_id
  WHERE
    m.conversation_id = p_conversation_id
    AND m.sender_id != p_user_id
    AND mr.message_id IS NULL -- Not already read
  ON CONFLICT DO NOTHING;

  -- Update participant's last_read_at
  UPDATE conversation_participants
  SET last_read_at = NOW()
  WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Conversations: Users can only see conversations they're part of
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
CREATE POLICY "Users can view their conversations" ON conversations
  FOR SELECT USING (
    id IN (
      SELECT conversation_id
      FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update group conversations they created" ON conversations;
CREATE POLICY "Users can update group conversations they created" ON conversations
  FOR UPDATE USING (created_by = auth.uid());

-- Participants: Users can see participants in their conversations
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
CREATE POLICY "Users can view conversation participants" ON conversation_participants
  FOR SELECT USING (
    conversation_id IN (
      SELECT conversation_id
      FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can join conversations" ON conversation_participants;
CREATE POLICY "Users can join conversations" ON conversation_participants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update their own participant settings" ON conversation_participants;
CREATE POLICY "Users can update their own participant settings" ON conversation_participants
  FOR UPDATE USING (user_id = auth.uid());

-- Messages: Users can only see messages in their conversations
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
CREATE POLICY "Users can view messages in their conversations" ON messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT conversation_id
      FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;
CREATE POLICY "Users can send messages to their conversations" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND conversation_id IN (
      SELECT conversation_id
      FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE USING (sender_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;
CREATE POLICY "Users can delete their own messages" ON messages
  FOR DELETE USING (sender_id = auth.uid());

-- Message reads: Users can only mark their own reads
DROP POLICY IF EXISTS "Users can view read receipts in their conversations" ON message_reads;
CREATE POLICY "Users can view read receipts in their conversations" ON message_reads
  FOR SELECT USING (
    message_id IN (
      SELECT m.id FROM messages m
      INNER JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
      WHERE cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can mark messages as read" ON message_reads;
CREATE POLICY "Users can mark messages as read" ON message_reads
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Follows: Anyone can view, users can manage their own follows
DROP POLICY IF EXISTS "Anyone can view follows" ON follows;
CREATE POLICY "Anyone can view follows" ON follows
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can follow others" ON follows;
CREATE POLICY "Users can follow others" ON follows
  FOR INSERT WITH CHECK (follower_id = auth.uid());

DROP POLICY IF EXISTS "Users can unfollow others" ON follows;
CREATE POLICY "Users can unfollow others" ON follows
  FOR DELETE USING (follower_id = auth.uid());

-- User presence: Anyone can view, users can update their own
DROP POLICY IF EXISTS "Anyone can view user presence" ON user_presence;
CREATE POLICY "Anyone can view user presence" ON user_presence
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own presence" ON user_presence;
CREATE POLICY "Users can update their own presence" ON user_presence
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own presence status" ON user_presence;
CREATE POLICY "Users can update their own presence status" ON user_presence
  FOR UPDATE USING (user_id = auth.uid());

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant access to authenticated users
GRANT ALL ON conversations TO authenticated;
GRANT ALL ON conversation_participants TO authenticated;
GRANT ALL ON messages TO authenticated;
GRANT ALL ON message_reads TO authenticated;
GRANT ALL ON follows TO authenticated;
GRANT ALL ON user_presence TO authenticated;

-- Grant access to service role (for admin operations)
GRANT ALL ON conversations TO service_role;
GRANT ALL ON conversation_participants TO service_role;
GRANT ALL ON messages TO service_role;
GRANT ALL ON message_reads TO service_role;
GRANT ALL ON follows TO service_role;
GRANT ALL ON user_presence TO service_role;

-- =====================================================
-- REALTIME SUBSCRIPTIONS
-- =====================================================

-- Enable Realtime for all messaging tables
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reads;
ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;

-- =====================================================
-- COMPLETE
-- =====================================================

COMMENT ON SCHEMA public IS 'VibeLog Messaging System v1.0 - Mobile-first voice messaging platform';
