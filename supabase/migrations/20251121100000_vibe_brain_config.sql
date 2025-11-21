-- Vibe Brain Configuration Table
-- Stores editable AI configurations for the admin panel

CREATE TABLE vibe_brain_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default configurations
INSERT INTO vibe_brain_config (key, value, description) VALUES
(
  'system_prompt',
  '{
    "content": "You are Vibe Brain, the AI assistant for VibeLog - a voice-to-publish platform where people share their thoughts through vibelogs.\n\nYour personality:\n- Friendly, warm, and encouraging\n- You celebrate creativity and authentic expression\n- You speak casually but thoughtfully\n- You use \"vibelogs\" (not blogs/posts) and \"vibes\" naturally\n- You''re knowledgeable about the platform and its community\n\nYour capabilities:\n- You know about public vibelogs, comments, and creators on the platform\n- You remember things about each user across conversations\n- You can help users discover content, understand features, and connect with the community\n- You provide personalized recommendations based on what you know about the user\n\nGuidelines:\n- Be concise but helpful (2-3 sentences usually)\n- When referencing vibelogs, mention the creator''s name if known\n- If you cite a vibelog, include its title\n- Encourage users to create and share their own vibes\n- Never make up information about vibelogs or users - only reference what''s in your context\n- If you don''t know something, say so honestly\n\nRemember: You''re here to help people vibe better!",
    "version": 1
  }',
  'The main system prompt that defines Vibe Brain''s personality and behavior'
),
(
  'model_settings',
  '{
    "model": "gpt-4o",
    "temperature": 0.7,
    "max_tokens": 500,
    "top_p": 1,
    "frequency_penalty": 0,
    "presence_penalty": 0
  }',
  'OpenAI model configuration settings'
),
(
  'memory_extraction',
  '{
    "enabled": true,
    "patterns": [
      {"regex": "I (?:love|like|enjoy|prefer) (.+?)(?:\\\\.|,|$)", "category": "preferences", "importance": 0.6},
      {"regex": "my favorite (.+?) is (.+?)(?:\\\\.|,|$)", "category": "preferences", "importance": 0.6},
      {"regex": "I(?:''m| am) (?:trying to|working on|building) (.+?)(?:\\\\.|,|$)", "category": "goals", "importance": 0.7},
      {"regex": "I want to (.+?)(?:\\\\.|,|$)", "category": "goals", "importance": 0.6},
      {"regex": "I(?:''m| am) a (.+?)(?:\\\\.|,|$)", "category": "personal", "importance": 0.7},
      {"regex": "I work (?:at|for|as) (.+?)(?:\\\\.|,|$)", "category": "personal", "importance": 0.7},
      {"regex": "I(?:''m| am) interested in (.+?)(?:\\\\.|,|$)", "category": "interests", "importance": 0.6}
    ],
    "auto_expire_days": null
  }',
  'Configuration for automatic memory extraction from conversations'
),
(
  'rag_settings',
  '{
    "content_types": ["vibelog", "comment", "profile"],
    "similarity_threshold": 0.6,
    "max_results": 5,
    "context_history_limit": 10
  }',
  'RAG (Retrieval Augmented Generation) settings for context retrieval'
),
(
  'tones',
  '{
    "default": "friendly",
    "available": [
      {"id": "friendly", "name": "Friendly", "modifier": "Be warm and approachable"},
      {"id": "professional", "name": "Professional", "modifier": "Be more formal and business-like"},
      {"id": "casual", "name": "Casual", "modifier": "Be extra relaxed and use casual language"},
      {"id": "enthusiastic", "name": "Enthusiastic", "modifier": "Be highly energetic and excited"}
    ]
  }',
  'Available tones/personalities for Vibe Brain'
);

-- RLS
ALTER TABLE vibe_brain_config ENABLE ROW LEVEL SECURITY;

-- Only service role can manage config
CREATE POLICY "Service role can manage config" ON vibe_brain_config
  FOR ALL USING (auth.role() = 'service_role');

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_vibe_brain_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vibe_brain_config_updated
BEFORE UPDATE ON vibe_brain_config
FOR EACH ROW EXECUTE FUNCTION update_vibe_brain_config_timestamp();
