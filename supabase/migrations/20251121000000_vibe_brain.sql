-- Vibe Brain: Platform-wide AI with per-user memory
-- Enable pgvector for semantic search

CREATE EXTENSION IF NOT EXISTS vector;

-- Content embeddings for semantic search across all public content
CREATE TABLE content_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (content_type IN ('vibelog', 'comment', 'profile')),
  content_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  embedding VECTOR(1536), -- OpenAI text-embedding-3-small dimensions
  text_chunk TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast vector similarity search
CREATE INDEX content_embeddings_embedding_idx ON content_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX content_embeddings_content_type_idx ON content_embeddings(content_type);
CREATE INDEX content_embeddings_content_id_idx ON content_embeddings(content_id);
CREATE INDEX content_embeddings_user_id_idx ON content_embeddings(user_id);

-- Conversation sessions
CREATE TABLE vibe_brain_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT, -- Auto-generated from first message
  summary TEXT, -- AI-generated conversation summary
  message_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX vibe_brain_conversations_user_id_idx ON vibe_brain_conversations(user_id);
CREATE INDEX vibe_brain_conversations_updated_at_idx ON vibe_brain_conversations(updated_at DESC);

-- Individual messages in conversations
CREATE TABLE vibe_brain_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES vibe_brain_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  sources JSONB DEFAULT '[]', -- Array of {type, id, title, url} for citations
  tokens_used INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX vibe_brain_messages_conversation_id_idx ON vibe_brain_messages(conversation_id);
CREATE INDEX vibe_brain_messages_created_at_idx ON vibe_brain_messages(created_at);

-- Per-user memory (facts Vibe Brain learns about each user)
CREATE TABLE user_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fact TEXT NOT NULL, -- "User loves coffee", "User is building a startup"
  category TEXT DEFAULT 'general', -- preferences, interests, goals, personal
  importance FLOAT DEFAULT 0.5 CHECK (importance >= 0 AND importance <= 1),
  source_message_id UUID REFERENCES vibe_brain_messages(id) ON DELETE SET NULL,
  embedding VECTOR(1536), -- For semantic memory retrieval
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ -- NULL = never expires
);

CREATE INDEX user_memories_user_id_idx ON user_memories(user_id);
CREATE INDEX user_memories_importance_idx ON user_memories(importance DESC);
CREATE INDEX user_memories_embedding_idx ON user_memories
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

-- Update message count trigger
CREATE OR REPLACE FUNCTION update_conversation_message_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE vibe_brain_conversations
    SET message_count = message_count + 1, updated_at = NOW()
    WHERE id = NEW.conversation_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE vibe_brain_conversations
    SET message_count = message_count - 1, updated_at = NOW()
    WHERE id = OLD.conversation_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vibe_brain_messages_count_trigger
AFTER INSERT OR DELETE ON vibe_brain_messages
FOR EACH ROW EXECUTE FUNCTION update_conversation_message_count();

-- RLS Policies
ALTER TABLE content_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vibe_brain_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vibe_brain_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memories ENABLE ROW LEVEL SECURITY;

-- Content embeddings: service role only (backend writes)
DROP POLICY IF EXISTS "Service role can manage embeddings" ON content_embeddings;
CREATE POLICY "Service role can manage embeddings" ON content_embeddings
  FOR ALL USING (auth.role() = 'service_role');

-- Conversations: users can only see their own
DROP POLICY IF EXISTS "Users can view own conversations" ON vibe_brain_conversations;
CREATE POLICY "Users can view own conversations" ON vibe_brain_conversations
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create own conversations" ON vibe_brain_conversations;
CREATE POLICY "Users can create own conversations" ON vibe_brain_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own conversations" ON vibe_brain_conversations;
CREATE POLICY "Users can delete own conversations" ON vibe_brain_conversations
  FOR DELETE USING (auth.uid() = user_id);

-- Messages: users can only see messages in their conversations
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON vibe_brain_messages;
CREATE POLICY "Users can view messages in own conversations" ON vibe_brain_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM vibe_brain_conversations
      WHERE id = conversation_id AND user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Service role can manage messages" ON vibe_brain_messages;
CREATE POLICY "Service role can manage messages" ON vibe_brain_messages
  FOR ALL USING (auth.role() = 'service_role');

-- User memories: users can see their own, service role can manage
DROP POLICY IF EXISTS "Users can view own memories" ON user_memories;
CREATE POLICY "Users can view own memories" ON user_memories
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Service role can manage memories" ON user_memories;
CREATE POLICY "Service role can manage memories" ON user_memories
  FOR ALL USING (auth.role() = 'service_role');

-- Function for vector similarity search
CREATE OR REPLACE FUNCTION search_content_embeddings(
  query_embedding VECTOR(1536),
  content_types TEXT[],
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  content_type TEXT,
  content_id UUID,
  user_id UUID,
  text_chunk TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.content_type,
    ce.content_id,
    ce.user_id,
    ce.text_chunk,
    ce.metadata,
    1 - (ce.embedding <=> query_embedding) AS similarity
  FROM content_embeddings ce
  WHERE ce.content_type = ANY(content_types)
    AND 1 - (ce.embedding <=> query_embedding) > match_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function for user memory search
CREATE OR REPLACE FUNCTION search_user_memories(
  p_user_id UUID,
  query_embedding VECTOR(1536),
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  fact TEXT,
  category TEXT,
  importance FLOAT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    um.id,
    um.fact,
    um.category,
    um.importance,
    1 - (um.embedding <=> query_embedding) AS similarity
  FROM user_memories um
  WHERE um.user_id = p_user_id
    AND (um.expires_at IS NULL OR um.expires_at > NOW())
  ORDER BY
    um.importance DESC,
    um.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Unique constraint for upsert
ALTER TABLE content_embeddings ADD CONSTRAINT content_embeddings_unique
  UNIQUE (content_id, content_type);
