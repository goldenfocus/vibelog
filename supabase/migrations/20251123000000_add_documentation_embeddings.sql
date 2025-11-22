-- Add 'documentation' as a valid content_type for embeddings
-- This allows Vibe Brain to search platform documentation (README, guides, etc.)

-- Step 1: Drop existing check constraint if it exists
ALTER TABLE content_embeddings
  DROP CONSTRAINT IF EXISTS content_embeddings_content_type_check;

-- Step 2: Add new check constraint with 'documentation' included
ALTER TABLE content_embeddings
  ADD CONSTRAINT content_embeddings_content_type_check
  CHECK (content_type IN ('vibelog', 'comment', 'profile', 'documentation'));

-- Step 3: Add index for fast documentation lookups
CREATE INDEX IF NOT EXISTS idx_content_embeddings_documentation
  ON content_embeddings(content_type, created_at DESC)
  WHERE content_type = 'documentation';

-- Step 4: Add comment explaining the new content_type
COMMENT ON COLUMN content_embeddings.content_type IS
  'Type of content: vibelog (user posts), comment (user comments), profile (user bios), documentation (platform docs)';

-- Note: metadata JSONB column will contain:
-- For documentation embeddings:
-- {
--   "source": "README.md" | "living-web-2026.md" | "branding.md" | "CLAUDE.md" | "evolution.md",
--   "section": "Quick Start" | "Philosophy" | etc.,
--   "chunk_index": 0,
--   "total_chunks": 10
-- }
