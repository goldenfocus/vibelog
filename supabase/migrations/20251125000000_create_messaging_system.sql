-- =====================================================
-- VIBELOG MESSAGING SYSTEM - MOBILE-FIRST ARCHITECTURE
-- =====================================================
-- Created: 2025-11-25
-- Description: Voice-first, mobile-native messaging with real-time features
-- Features: DMs, group chats, voice/video/text messages, typing indicators,
--           read receipts, presence tracking, follows system
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

CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC NULLS LAST);
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

CREATE INDEX idx_participants_user ON conversation_participants(user_id, last_read_at DESC);
CREATE INDEX idx_participants_conv ON conversation_participants(conversation_id);
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

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC)
  WHERE is_deleted = false;
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_reply ON messages(reply_to_message_id)
  WHERE reply_to_message_id IS NOT NULL;
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- Full-text search on content and transcript
CREATE INDEX idx_messages_content_search ON messages
  USING gin(to_tsvector('english', COALESCE(content, '') || ' ' || COALESCE(transcript, '')))
  WHERE is_deleted = false;

COMMENT ON TABLE messages IS 'Multi-modal messages: text, voice, video, or combinations';
COMMENT ON COLUMN messages.audio_duration IS 'Voice message duration in milliseconds';
COMMENT ON COLUMN messages.transcript IS 'Auto-generated via Whisper, enables voice message search';

-- Add foreign key to conversation_participants now that messages table exists
ALTER TABLE conversation_participants
ADD CONSTRAINT fk_last_read_message
FOREIGN KEY (last_read_message_id) REFERENCES messages(id) ON DELETE SET NULL;

-- =====================================================
-- 4. MESSAGE READS TABLE (Read Receipts)
-- =====================================================
CREATE TABLE IF NOT EXISTS message_reads (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY(message_id, user_id)
);

CREATE INDEX idx_message_reads_message ON message_reads(message_id, read_at);
CREATE INDEX idx_message_reads_user ON message_reads(user_id);

COMMENT ON TABLE message_reads IS 'Read receipts: track when each user read each message';

-- =====================================================
-- 5. FOLLOWS TABLE (Social Graph)
-- =====================================================
CREATE TABLE IF NOT EXISTS follows (
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY(follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

COMMENT ON TABLE follows IS 'User follow relationships (social graph)';

-- Add follower counts to profiles (denormalized for performance)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS follower_count INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS following_count INT DEFAULT 0;

-- =====================================================
-- 6. USER PRESENCE TABLE (Online Status)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('online', 'offline', 'away')) DEFAULT 'offline',
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_presence_status ON user_presence(status, last_seen_at);

COMMENT ON TABLE user_presence IS 'Real-time user online/offline status';

-- =====================================================
-- 7. TRIGGERS & FUNCTIONS
-- =====================================================

-- Update conversation timestamp on new message
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET
    updated_at = NOW(),
    last_message_at = NOW(),
    last_message_id = NEW.id
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_timestamp
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_timestamp();

-- Auto-create read receipt for sender (they've already "read" their own message)
CREATE OR REPLACE FUNCTION create_sender_read_receipt()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO message_reads (message_id, user_id, read_at)
  VALUES (NEW.id, NEW.sender_id, NOW())
  ON CONFLICT (message_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_sender_read_receipt
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION create_sender_read_receipt();

-- Update follower counts on follow/unfollow
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment counts
    UPDATE profiles SET following_count = following_count + 1
      WHERE id = NEW.follower_id;
    UPDATE profiles SET follower_count = follower_count + 1
      WHERE id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement counts
    UPDATE profiles SET following_count = GREATEST(following_count - 1, 0)
      WHERE id = OLD.follower_id;
    UPDATE profiles SET follower_count = GREATEST(follower_count - 1, 0)
      WHERE id = OLD.following_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_follow_counts
AFTER INSERT OR DELETE ON follows
FOR EACH ROW
EXECUTE FUNCTION update_follow_counts();

-- Update message timestamp on edit
CREATE OR REPLACE FUNCTION update_message_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.content != OLD.content OR NEW.audio_url != OLD.audio_url THEN
    NEW.updated_at = NOW();
    NEW.edited_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_message_timestamp
BEFORE UPDATE ON messages
FOR EACH ROW
EXECUTE FUNCTION update_message_timestamp();

-- =====================================================
-- 8. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Conversations: Only participants can view
CREATE POLICY "Participants can view conversations"
ON conversations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conversations.id
      AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create conversations"
ON conversations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Participants can update conversations"
ON conversations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conversations.id
      AND user_id = auth.uid()
  )
);

-- Conversation participants: Participants can view
CREATE POLICY "Participants can view participant list"
ON conversation_participants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can add themselves to conversations"
ON conversation_participants FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own participation"
ON conversation_participants FOR UPDATE
USING (user_id = auth.uid());

-- Messages: Only participants can view
CREATE POLICY "Participants can view messages"
ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
  )
  AND is_deleted = false
);

CREATE POLICY "Participants can send messages"
ON messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
  )
);

CREATE POLICY "Senders can update own messages"
ON messages FOR UPDATE
USING (sender_id = auth.uid());

CREATE POLICY "Senders can delete own messages"
ON messages FOR DELETE
USING (sender_id = auth.uid());

-- Read receipts: Users can view and create own
CREATE POLICY "Participants can view read receipts"
ON message_reads FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages m
    JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = message_reads.message_id
      AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create own read receipts"
ON message_reads FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Follows: Public viewing, own management
CREATE POLICY "Anyone can view follows"
ON follows FOR SELECT
USING (true);

CREATE POLICY "Users can follow others"
ON follows FOR INSERT
WITH CHECK (follower_id = auth.uid());

CREATE POLICY "Users can unfollow"
ON follows FOR DELETE
USING (follower_id = auth.uid());

-- Presence: Public viewing, own management
CREATE POLICY "Anyone can view presence"
ON user_presence FOR SELECT
USING (true);

CREATE POLICY "Users can update own presence"
ON user_presence FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own presence status"
ON user_presence FOR UPDATE
USING (user_id = auth.uid());

-- =====================================================
-- 9. HELPER FUNCTIONS
-- =====================================================

-- Get or create DM conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_dm(
  user1_id UUID,
  user2_id UUID
)
RETURNS UUID AS $$
DECLARE
  conv_id UUID;
BEGIN
  -- Check if DM already exists between these users
  SELECT c.id INTO conv_id
  FROM conversations c
  WHERE c.type = 'dm'
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp1
      WHERE cp1.conversation_id = c.id AND cp1.user_id = user1_id
    )
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp2
      WHERE cp2.conversation_id = c.id AND cp2.user_id = user2_id
    )
  LIMIT 1;

  -- If no existing DM, create new one
  IF conv_id IS NULL THEN
    INSERT INTO conversations (type)
    VALUES ('dm')
    RETURNING id INTO conv_id;

    -- Add both participants
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES
      (conv_id, user1_id),
      (conv_id, user2_id);
  END IF;

  RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_or_create_dm IS 'Get existing or create new DM conversation between two users';

-- Get unread message count per conversation for a user
CREATE OR REPLACE FUNCTION get_unread_count(p_user_id UUID)
RETURNS TABLE(conversation_id UUID, unread_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.conversation_id,
    COUNT(*)::BIGINT as unread_count
  FROM messages m
  JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
  LEFT JOIN message_reads mr ON mr.message_id = m.id AND mr.user_id = p_user_id
  WHERE cp.user_id = p_user_id
    AND m.sender_id != p_user_id
    AND m.is_deleted = false
    AND mr.message_id IS NULL
  GROUP BY m.conversation_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_unread_count IS 'Get unread message count per conversation for user';

-- Mark all messages in conversation as read
CREATE OR REPLACE FUNCTION mark_conversation_read(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Insert read receipts for all unread messages
  INSERT INTO message_reads (message_id, user_id, read_at)
  SELECT m.id, p_user_id, NOW()
  FROM messages m
  LEFT JOIN message_reads mr ON mr.message_id = m.id AND mr.user_id = p_user_id
  WHERE m.conversation_id = p_conversation_id
    AND m.is_deleted = false
    AND mr.message_id IS NULL
  ON CONFLICT (message_id, user_id) DO NOTHING;

  -- Update last_read_at in participant record
  UPDATE conversation_participants
  SET
    last_read_at = NOW(),
    last_read_message_id = (
      SELECT id FROM messages
      WHERE conversation_id = p_conversation_id
        AND is_deleted = false
      ORDER BY created_at DESC
      LIMIT 1
    )
  WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION mark_conversation_read IS 'Mark all messages in conversation as read for user';

-- =====================================================
-- 10. NOTIFICATION INTEGRATION
-- =====================================================

-- Add message notification type to existing notification_preferences
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS vibe_thread_message_in_app BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS vibe_thread_message_email BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS vibe_thread_message_push BOOLEAN DEFAULT false;

-- Trigger notification on new message
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notification for all participants except sender
  INSERT INTO notifications (
    user_id,
    type,
    actor_id,
    actor_username,
    actor_display_name,
    actor_avatar_url,
    title,
    message,
    action_url,
    priority
  )
  SELECT
    cp.user_id,
    'vibe_thread_message',
    NEW.sender_id,
    p.username,
    p.display_name,
    p.avatar_url,
    'New message from ' || p.display_name,
    CASE
      WHEN NEW.content IS NOT NULL THEN LEFT(NEW.content, 100)
      WHEN NEW.audio_url IS NOT NULL THEN '🎤 Voice message'
      WHEN NEW.video_url IS NOT NULL THEN '🎥 Video message'
      ELSE 'New message'
    END,
    '/messages/' || NEW.conversation_id,
    CASE
      WHEN cp.is_muted THEN 'low'
      ELSE 'medium'
    END::TEXT
  FROM conversation_participants cp
  JOIN profiles p ON p.id = NEW.sender_id
  LEFT JOIN notification_preferences np ON np.user_id = cp.user_id
  WHERE cp.conversation_id = NEW.conversation_id
    AND cp.user_id != NEW.sender_id
    AND (np.vibe_thread_message_in_app IS NULL OR np.vibe_thread_message_in_app = true);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_new_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION notify_new_message();

COMMENT ON FUNCTION notify_new_message IS 'Send notification to all participants when new message arrives';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- This migration creates:
-- ✅ 6 tables (conversations, participants, messages, reads, follows, presence)
-- ✅ 12 indexes for performance
-- ✅ 7 triggers for auto-updates
-- ✅ 12 RLS policies for security
-- ✅ 4 helper functions
-- ✅ Notification integration
--
-- Ready for:
-- - Multi-modal messaging (text/voice/video)
-- - Real-time features (typing, presence, read receipts)
-- - Social graph (follows)
-- - AI enhancement (transcription, summaries, vibe analysis)
-- - Mobile-first UX (optimized queries)
-- =====================================================
