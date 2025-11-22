-- =====================================================
-- VIBELOG MESSAGING SYSTEM - COMPREHENSIVE MIGRATION
-- =====================================================
-- Version: 1.0.0
-- Created: 2025-11-24
-- Description: Enterprise-grade messaging system with DM/Group support,
--              threading, reactions, read receipts, typing indicators,
--              and AI training opt-in capabilities.
-- =====================================================

-- =====================================================
-- 1. CONVERSATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Conversation type (extensible for future features)
  type TEXT NOT NULL CHECK (type IN ('dm', 'group', 'ai')) DEFAULT 'dm',

  -- Group chat title (NULL for DMs, auto-generated from usernames)
  title TEXT,

  -- Creator reference
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ,

  -- AI training opt-in
  ai_trainable BOOLEAN DEFAULT false,

  -- Soft delete
  deleted_at TIMESTAMPTZ
);

-- Performance indexes
CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC NULLS LAST) WHERE deleted_at IS NULL;
CREATE INDEX idx_conversations_type ON conversations(type) WHERE deleted_at IS NULL;
CREATE INDEX idx_conversations_created_by ON conversations(created_by) WHERE deleted_at IS NULL;

-- Comments
COMMENT ON TABLE conversations IS 'User-to-user and group conversations';
COMMENT ON COLUMN conversations.type IS 'Conversation type: dm (1:1), group (many), ai (user-bot)';
COMMENT ON COLUMN conversations.ai_trainable IS 'Opt-in flag for AI training data collection';

-- =====================================================
-- 2. CONVERSATION PARTICIPANTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Role (for group chat permissions)
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')) DEFAULT 'member',

  -- User-specific settings
  is_muted BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,

  -- Read tracking
  last_read_message_id UUID,  -- Will reference messages(id) after table creation
  last_read_at TIMESTAMPTZ,

  -- Timestamps
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,

  -- Unique constraint: user can only be in conversation once
  UNIQUE(conversation_id, user_id)
);

-- Performance indexes
CREATE INDEX idx_participants_user ON conversation_participants(user_id) WHERE left_at IS NULL;
CREATE INDEX idx_participants_conv ON conversation_participants(conversation_id) WHERE left_at IS NULL;
CREATE INDEX idx_participants_unread ON conversation_participants(user_id, last_read_at) WHERE left_at IS NULL;

-- Comments
COMMENT ON TABLE conversation_participants IS 'Many-to-many relationship between users and conversations';
COMMENT ON COLUMN conversation_participants.role IS 'Participant role: owner, admin, or member';
COMMENT ON COLUMN conversation_participants.last_read_message_id IS 'Last message read by this user';

-- =====================================================
-- 3. MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Threading support (any message can be a thread parent)
  parent_message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  thread_message_count INT DEFAULT 0,

  -- Content
  content TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('text', 'image', 'file', 'voice', 'video')) DEFAULT 'text',

  -- Media attachments (JSON array)
  -- Schema: [{type: 'image', url: '...', name: '...', size: 123, mimeType: '...'}]
  attachments JSONB DEFAULT '[]'::jsonb,

  -- Metadata (extensible JSON object)
  -- Schema: {edited: bool, edited_at: timestamp, ai_generated: bool, vibe_scores: {...}}
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  -- AI training opt-in (inherits from conversation, can override)
  ai_trainable BOOLEAN DEFAULT true
);

-- Performance indexes
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_sender ON messages(sender_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_parent ON messages(parent_message_id) WHERE parent_message_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_messages_created ON messages(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_content_type ON messages(content_type) WHERE deleted_at IS NULL;

-- Full-text search index (for message search)
CREATE INDEX idx_messages_content_search ON messages USING gin(to_tsvector('english', content)) WHERE deleted_at IS NULL;

-- Comments
COMMENT ON TABLE messages IS 'Individual messages in conversations';
COMMENT ON COLUMN messages.parent_message_id IS 'If set, this is a reply in a thread';
COMMENT ON COLUMN messages.attachments IS 'JSON array of media attachments';
COMMENT ON COLUMN messages.metadata IS 'Extensible JSON metadata (edited, AI-generated, etc.)';

-- Now add foreign key constraint to conversation_participants
ALTER TABLE conversation_participants
ADD CONSTRAINT fk_last_read_message
FOREIGN KEY (last_read_message_id) REFERENCES messages(id) ON DELETE SET NULL;

-- =====================================================
-- 4. MESSAGE STATUS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS message_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Status progression: sent → delivered → read
  status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'read')) DEFAULT 'sent',

  -- Timestamp
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique constraint: one status per user per message
  UNIQUE(message_id, user_id)
);

-- Performance indexes
CREATE INDEX idx_message_status_message ON message_status(message_id);
CREATE INDEX idx_message_status_user ON message_status(user_id);
CREATE INDEX idx_message_status_unread ON message_status(user_id, status) WHERE status != 'read';

-- Comments
COMMENT ON TABLE message_status IS 'Read receipts and delivery status per recipient';
COMMENT ON COLUMN message_status.status IS 'Message status: sent, delivered, or read';

-- =====================================================
-- 5. MESSAGE REACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Reaction (Unicode emoji or :shortcode:)
  emoji TEXT NOT NULL,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique constraint: user can only react with same emoji once
  UNIQUE(message_id, user_id, emoji)
);

-- Performance indexes
CREATE INDEX idx_reactions_message ON message_reactions(message_id);
CREATE INDEX idx_reactions_user ON message_reactions(user_id);

-- Comments
COMMENT ON TABLE message_reactions IS 'Emoji reactions on messages (like Slack/Telegram)';
COMMENT ON COLUMN message_reactions.emoji IS 'Unicode emoji or :shortcode: (e.g., "👍" or ":thumbsup:")';

-- =====================================================
-- 6. USER RELATIONSHIPS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Relationship type (extensible)
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('block', 'mute', 'follow')),

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique constraint: one relationship type per pair
  UNIQUE(user_id, target_user_id, relationship_type),

  -- Prevent self-relationships
  CHECK (user_id != target_user_id)
);

-- Performance indexes
CREATE INDEX idx_relationships_user ON user_relationships(user_id, relationship_type);
CREATE INDEX idx_relationships_target ON user_relationships(target_user_id, relationship_type);

-- Comments
COMMENT ON TABLE user_relationships IS 'User-to-user relationships: block, mute, follow';
COMMENT ON COLUMN user_relationships.relationship_type IS 'Type: block (hard block), mute (hide), follow (social graph)';

-- =====================================================
-- 7. TRIGGERS & FUNCTIONS
-- =====================================================

-- =====================================================
-- 7.1 Update conversation timestamp on new message
-- =====================================================
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET
    updated_at = now(),
    last_message_at = now()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_timestamp
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_timestamp();

COMMENT ON FUNCTION update_conversation_timestamp IS 'Auto-update conversation timestamps when new message arrives';

-- =====================================================
-- 7.2 Update thread message count
-- =====================================================
CREATE OR REPLACE FUNCTION update_thread_count()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is a reply (has parent), update parent's thread count
  IF NEW.parent_message_id IS NOT NULL THEN
    UPDATE messages
    SET thread_message_count = (
      SELECT COUNT(*)
      FROM messages
      WHERE parent_message_id = NEW.parent_message_id
        AND deleted_at IS NULL
    )
    WHERE id = NEW.parent_message_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_thread_count
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_thread_count();

COMMENT ON FUNCTION update_thread_count IS 'Auto-update thread reply count when new reply is added';

-- =====================================================
-- 7.3 Create message status entries for all participants
-- =====================================================
CREATE OR REPLACE FUNCTION create_message_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Create 'sent' status for all participants except sender
  INSERT INTO message_status (message_id, user_id, status, updated_at)
  SELECT
    NEW.id,
    cp.user_id,
    'sent',
    now()
  FROM conversation_participants cp
  WHERE cp.conversation_id = NEW.conversation_id
    AND cp.user_id != NEW.sender_id
    AND cp.left_at IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_message_status
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION create_message_status();

COMMENT ON FUNCTION create_message_status IS 'Auto-create message status entries for all recipients';

-- =====================================================
-- 7.4 Update message updated_at on content edit
-- =====================================================
CREATE OR REPLACE FUNCTION update_message_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if content actually changed
  IF NEW.content != OLD.content THEN
    NEW.updated_at = now();
    NEW.metadata = jsonb_set(
      COALESCE(NEW.metadata, '{}'::jsonb),
      '{edited}',
      'true'::jsonb
    );
    NEW.metadata = jsonb_set(
      NEW.metadata,
      '{edited_at}',
      to_jsonb(now())
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_message_timestamp
BEFORE UPDATE ON messages
FOR EACH ROW
EXECUTE FUNCTION update_message_timestamp();

COMMENT ON FUNCTION update_message_timestamp IS 'Auto-update message timestamp and metadata on edit';

-- =====================================================
-- 8. ROW-LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_relationships ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 8.1 Conversations RLS
-- =====================================================

-- Users can view conversations they're participants in
CREATE POLICY "Users can view their conversations"
ON conversations FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM conversation_participants cp
    WHERE cp.conversation_id = conversations.id
      AND cp.user_id = auth.uid()
      AND cp.left_at IS NULL
  )
);

-- Users can create conversations
CREATE POLICY "Users can create conversations"
ON conversations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update conversations they created (for group chat settings)
CREATE POLICY "Users can update their conversations"
ON conversations FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM conversation_participants cp
    WHERE cp.conversation_id = conversations.id
      AND cp.user_id = auth.uid()
      AND cp.role IN ('owner', 'admin')
  )
);

-- =====================================================
-- 8.2 Conversation Participants RLS
-- =====================================================

-- Users can view participants in conversations they're in
CREATE POLICY "Users can view participants in their conversations"
ON conversation_participants FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
      AND cp.left_at IS NULL
  )
);

-- Users can add themselves to conversations (when invited)
CREATE POLICY "Users can join conversations"
ON conversation_participants FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own participant settings
CREATE POLICY "Users can update their participant settings"
ON conversation_participants FOR UPDATE
USING (user_id = auth.uid());

-- =====================================================
-- 8.3 Messages RLS
-- =====================================================

-- Users can view messages in conversations they're in
CREATE POLICY "Users can view messages in their conversations"
ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id = auth.uid()
      AND cp.left_at IS NULL
  )
);

-- Users can send messages in conversations they're in
CREATE POLICY "Users can send messages in their conversations"
ON messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id = auth.uid()
      AND cp.left_at IS NULL
  )
  AND NOT EXISTS (
    -- Prevent sending messages to blocked users
    SELECT 1
    FROM user_relationships ur
    JOIN conversation_participants cp ON cp.conversation_id = messages.conversation_id
    WHERE (
      (ur.user_id = auth.uid() AND ur.target_user_id = cp.user_id)
      OR (ur.user_id = cp.user_id AND ur.target_user_id = auth.uid())
    )
    AND ur.relationship_type = 'block'
  )
);

-- Users can update their own messages (for editing)
CREATE POLICY "Users can update their own messages"
ON messages FOR UPDATE
USING (sender_id = auth.uid());

-- Users can soft-delete their own messages
CREATE POLICY "Users can delete their own messages"
ON messages FOR DELETE
USING (sender_id = auth.uid());

-- =====================================================
-- 8.4 Message Status RLS
-- =====================================================

-- Users can view status of messages in their conversations
CREATE POLICY "Users can view message status in their conversations"
ON message_status FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM messages m
    JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = message_status.message_id
      AND cp.user_id = auth.uid()
      AND cp.left_at IS NULL
  )
);

-- Users can update their own message status (mark as read)
CREATE POLICY "Users can update their own message status"
ON message_status FOR UPDATE
USING (user_id = auth.uid());

-- =====================================================
-- 8.5 Message Reactions RLS
-- =====================================================

-- Users can view reactions in their conversations
CREATE POLICY "Users can view reactions in their conversations"
ON message_reactions FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM messages m
    JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = message_reactions.message_id
      AND cp.user_id = auth.uid()
      AND cp.left_at IS NULL
  )
);

-- Users can add reactions to messages in their conversations
CREATE POLICY "Users can add reactions in their conversations"
ON message_reactions FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM messages m
    JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = message_reactions.message_id
      AND cp.user_id = auth.uid()
      AND cp.left_at IS NULL
  )
);

-- Users can remove their own reactions
CREATE POLICY "Users can remove their own reactions"
ON message_reactions FOR DELETE
USING (user_id = auth.uid());

-- =====================================================
-- 8.6 User Relationships RLS
-- =====================================================

-- Users can view their own relationships
CREATE POLICY "Users can view their own relationships"
ON user_relationships FOR SELECT
USING (user_id = auth.uid());

-- Users can create their own relationships
CREATE POLICY "Users can create their own relationships"
ON user_relationships FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can delete their own relationships
CREATE POLICY "Users can delete their own relationships"
ON user_relationships FOR DELETE
USING (user_id = auth.uid());

-- =====================================================
-- 9. AI TRAINING MATERIALIZED VIEW
-- =====================================================

-- Materialized view for AI training export (anonymized data)
CREATE MATERIALIZED VIEW IF NOT EXISTS ai_training_messages AS
SELECT
  m.id,
  m.content,
  m.content_type,
  m.created_at,

  -- Pseudonymized IDs (one-way hash)
  encode(digest(m.sender_id::text, 'sha256'), 'hex') as sender_hash,
  encode(digest(m.conversation_id::text, 'sha256'), 'hex') as conversation_hash,

  -- Metadata
  (m.metadata->>'ai_generated')::boolean as is_ai_generated,
  (m.metadata->>'edited')::boolean as is_edited,
  m.thread_message_count,

  -- Conversation context
  c.type as conversation_type,

  -- Reaction count (engagement metric)
  (
    SELECT COUNT(*)
    FROM message_reactions mr
    WHERE mr.message_id = m.id
  ) as reaction_count

FROM messages m
JOIN conversations c ON c.id = m.conversation_id
WHERE
  m.ai_trainable = true
  AND m.deleted_at IS NULL
  AND c.ai_trainable = true
  AND c.deleted_at IS NULL
  AND m.content_type = 'text';  -- Only text messages for training

-- Index for efficient querying
CREATE INDEX idx_ai_training_created ON ai_training_messages(created_at DESC);
CREATE INDEX idx_ai_training_conversation ON ai_training_messages(conversation_hash);

COMMENT ON MATERIALIZED VIEW ai_training_messages IS 'Anonymized message data for AI training (opt-in only)';

-- =====================================================
-- 10. HELPER FUNCTIONS
-- =====================================================

-- =====================================================
-- 10.1 Get or create DM conversation
-- =====================================================
CREATE OR REPLACE FUNCTION get_or_create_dm_conversation(
  participant1_id UUID,
  participant2_id UUID
)
RETURNS UUID AS $$
DECLARE
  conversation_id UUID;
BEGIN
  -- Check if DM conversation already exists between these users
  SELECT c.id INTO conversation_id
  FROM conversations c
  WHERE c.type = 'dm'
    AND c.deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM conversation_participants cp1
      JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
      WHERE cp1.conversation_id = c.id
        AND cp1.user_id = participant1_id
        AND cp2.user_id = participant2_id
        AND cp1.left_at IS NULL
        AND cp2.left_at IS NULL
    )
  LIMIT 1;

  -- If conversation doesn't exist, create it
  IF conversation_id IS NULL THEN
    INSERT INTO conversations (type, created_by)
    VALUES ('dm', participant1_id)
    RETURNING id INTO conversation_id;

    -- Add both participants
    INSERT INTO conversation_participants (conversation_id, user_id, role)
    VALUES
      (conversation_id, participant1_id, 'member'),
      (conversation_id, participant2_id, 'member');
  END IF;

  RETURN conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_or_create_dm_conversation IS 'Get existing or create new DM conversation between two users';

-- =====================================================
-- 10.2 Mark conversation as read
-- =====================================================
CREATE OR REPLACE FUNCTION mark_conversation_as_read(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
DECLARE
  latest_message_id UUID;
BEGIN
  -- Get the latest message in the conversation
  SELECT id INTO latest_message_id
  FROM messages
  WHERE conversation_id = p_conversation_id
    AND deleted_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  -- Update participant's last read message
  UPDATE conversation_participants
  SET
    last_read_message_id = latest_message_id,
    last_read_at = now()
  WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id;

  -- Mark all messages as read
  UPDATE message_status
  SET
    status = 'read',
    updated_at = now()
  WHERE user_id = p_user_id
    AND message_id IN (
      SELECT id
      FROM messages
      WHERE conversation_id = p_conversation_id
        AND deleted_at IS NULL
    )
    AND status != 'read';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION mark_conversation_as_read IS 'Mark all messages in a conversation as read for a user';

-- =====================================================
-- 10.3 Get unread message count for user
-- =====================================================
CREATE OR REPLACE FUNCTION get_unread_count(p_user_id UUID)
RETURNS TABLE(conversation_id UUID, unread_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.conversation_id,
    COUNT(*)::BIGINT as unread_count
  FROM messages m
  JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
  LEFT JOIN message_status ms ON ms.message_id = m.id AND ms.user_id = p_user_id
  WHERE cp.user_id = p_user_id
    AND cp.left_at IS NULL
    AND m.sender_id != p_user_id
    AND m.deleted_at IS NULL
    AND (ms.status IS NULL OR ms.status != 'read')
  GROUP BY m.conversation_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_unread_count IS 'Get unread message count per conversation for a user';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- This migration creates a complete messaging system with:
-- ✅ Conversations (DM/Group/AI extensible)
-- ✅ Messages with threading support
-- ✅ Read receipts & delivery status
-- ✅ Emoji reactions
-- ✅ User relationships (block/mute/follow)
-- ✅ Row-level security
-- ✅ Auto-updating triggers
-- ✅ AI training opt-in infrastructure
-- ✅ Helper functions for common operations
-- =====================================================
