-- Migration: Add support for anonymous vibelogs
-- Adds missing columns that the application expects: public_slug, session_id, teaser
-- This fixes the "Vibelog not found" issue in Comments component

-- 1. Make user_id nullable to support anonymous vibelogs
ALTER TABLE vibelogs ALTER COLUMN user_id DROP NOT NULL;

-- 2. Add public_slug for anonymous vibelog routing
-- This is used by Comments component and all vibelog links
ALTER TABLE vibelogs ADD COLUMN IF NOT EXISTS public_slug TEXT;

-- 3. Add session_id for tracking anonymous sessions
ALTER TABLE vibelogs ADD COLUMN IF NOT EXISTS session_id TEXT;

-- 4. Add teaser for preview content (first 500 chars of content)
ALTER TABLE vibelogs ADD COLUMN IF NOT EXISTS teaser TEXT;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vibelogs_public_slug ON vibelogs(public_slug) WHERE public_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vibelogs_session_id ON vibelogs(session_id) WHERE session_id IS NOT NULL;

-- 6. Add unique constraint to public_slug (prevent duplicates)
-- First remove any potential duplicates by appending row number
WITH ranked_slugs AS (
  SELECT id, public_slug,
         ROW_NUMBER() OVER (PARTITION BY public_slug ORDER BY created_at) as rn
  FROM vibelogs
  WHERE public_slug IS NOT NULL
)
UPDATE vibelogs v
SET public_slug = CONCAT(v.public_slug, '-', rs.rn)
FROM ranked_slugs rs
WHERE v.id = rs.id AND rs.rn > 1;

-- Now add the unique constraint
ALTER TABLE vibelogs ADD CONSTRAINT vibelogs_public_slug_key UNIQUE (public_slug);

-- 7. Update RLS policies to allow anonymous inserts
DROP POLICY IF EXISTS "vibelogs insert own" ON vibelogs;
CREATE POLICY "vibelogs insert own" ON vibelogs
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id  -- Authenticated users
    OR user_id IS NULL    -- Anonymous users
  );

-- 8. Backfill existing vibelogs with teaser (use first 500 chars of content)
UPDATE vibelogs
SET teaser = LEFT(content, 500)
WHERE teaser IS NULL AND content IS NOT NULL;

-- 9. Backfill existing authenticated vibelogs with public_slug
-- For authenticated users: use existing slug
-- For anonymous users (or if slug is NULL): generate from title + id
UPDATE vibelogs
SET public_slug = COALESCE(
  slug,  -- Use existing slug if available
  CONCAT(
    LOWER(REGEXP_REPLACE(COALESCE(title, 'untitled'), '[^a-zA-Z0-9]+', '-', 'g')),
    '-',
    SUBSTRING(id::text FROM 1 FOR 8)
  )
)
WHERE public_slug IS NULL;

-- 10. Add trigger to auto-generate public_slug if not provided
CREATE OR REPLACE FUNCTION generate_public_slug()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if public_slug is NULL
  IF NEW.public_slug IS NULL THEN
    NEW.public_slug := COALESCE(
      NEW.slug,
      CONCAT(
        LOWER(REGEXP_REPLACE(COALESCE(NEW.title, 'untitled'), '[^a-zA-Z0-9]+', '-', 'g')),
        '-',
        SUBSTRING(NEW.id::text FROM 1 FOR 8)
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_public_slug ON vibelogs;
CREATE TRIGGER ensure_public_slug
  BEFORE INSERT OR UPDATE ON vibelogs
  FOR EACH ROW
  EXECUTE FUNCTION generate_public_slug();

-- Add column comments for documentation
COMMENT ON COLUMN vibelogs.public_slug IS 'URL-safe slug for anonymous and public vibelog access. Used by Comments component and all vibelog links.';
COMMENT ON COLUMN vibelogs.session_id IS 'Session identifier for anonymous vibelog tracking';
COMMENT ON COLUMN vibelogs.teaser IS 'Short preview of vibelog content (first 500 chars)';
