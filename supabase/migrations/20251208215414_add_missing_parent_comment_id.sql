-- ============================================================================
-- FIX: Add missing parent_comment_id column to comments
-- ============================================================================
-- Description: The notification triggers reference parent_comment_id but the
--              column was never created. This migration adds it.
--              Bug: API returns 500 when creating comments because it tries
--              to insert into non-existent parent_comment_id column.
-- ============================================================================

-- Add the missing parent_comment_id column for reply threading
ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_comment_id uuid REFERENCES comments(id) ON DELETE CASCADE;

-- Index for efficient reply lookups
CREATE INDEX IF NOT EXISTS comments_parent_comment_id_idx ON comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;
