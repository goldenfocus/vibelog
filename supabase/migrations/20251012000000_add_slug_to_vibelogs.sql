-- Migration: Add slug column for SEO-friendly URLs
-- vibelog.io/username/slug-of-vibelog instead of vibelog.io/vibelogs/uuid

-- 1. Add slug column
ALTER TABLE public.vibelogs
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- 2. Create unique index on (user_id, slug) to prevent duplicate slugs per user
CREATE UNIQUE INDEX IF NOT EXISTS vibelogs_user_slug_idx
  ON public.vibelogs (user_id, slug)
  WHERE slug IS NOT NULL;

-- 3. Create index for quick slug lookups
CREATE INDEX IF NOT EXISTS vibelogs_slug_idx
  ON public.vibelogs (slug)
  WHERE slug IS NOT NULL;

-- 4. Generate slugs for existing vibelogs (from title)
-- This function creates URL-friendly slugs: "Hello World!" -> "hello-world"
CREATE OR REPLACE FUNCTION generate_slug(text_input TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(text_input, '[^a-zA-Z0-9\s-]', '', 'g'),  -- Remove special chars
        '\s+', '-', 'g'                                           -- Replace spaces with hyphens
      ),
      '-+', '-', 'g'                                               -- Replace multiple hyphens with single
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. Update existing vibelogs with generated slugs
UPDATE public.vibelogs
SET slug = SUBSTRING(generate_slug(title) || '-' || SUBSTRING(id::TEXT FROM 1 FOR 8), 1, 100)
WHERE slug IS NULL AND title IS NOT NULL;

-- 6. For any vibelogs without titles, use "untitled-{uuid-prefix}"
UPDATE public.vibelogs
SET slug = 'untitled-' || SUBSTRING(id::TEXT FROM 1 FOR 8)
WHERE slug IS NULL;
