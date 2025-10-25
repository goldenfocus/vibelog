-- Migration 009: Backfill slugs for existing vibelogs
-- This migration generates slugs for vibelogs that don't have them yet

DO $$
DECLARE
  vibelog_record RECORD;
  base_slug TEXT;
  final_slug TEXT;
  slug_suffix TEXT;
BEGIN
  -- Loop through all vibelogs that don't have a slug
  FOR vibelog_record IN
    SELECT v.id, v.title, v.user_id, p.username
    FROM vibelogs v
    LEFT JOIN profiles p ON v.user_id = p.id
    WHERE v.slug IS NULL OR v.slug = ''
  LOOP
    -- Generate base slug from title
    base_slug := LOWER(REGEXP_REPLACE(vibelog_record.title, '[^a-zA-Z0-9]+', '-', 'g'));
    base_slug := TRIM(BOTH '-' FROM base_slug);
    base_slug := SUBSTRING(base_slug FROM 1 FOR 50); -- Limit length

    -- Add unique suffix using first 8 chars of UUID
    slug_suffix := SUBSTRING(vibelog_record.id::TEXT FROM 1 FOR 8);
    final_slug := base_slug || '-' || slug_suffix;

    -- Update the vibelog with the new slug
    UPDATE vibelogs
    SET slug = final_slug
    WHERE id = vibelog_record.id;

    RAISE NOTICE 'Generated slug for vibelog %: % -> %',
      vibelog_record.id, vibelog_record.title, final_slug;
  END LOOP;
END $$;

-- Verify: Show count of vibelogs with and without slugs
SELECT
  COUNT(*) FILTER (WHERE slug IS NOT NULL AND slug != '') as with_slug,
  COUNT(*) FILTER (WHERE slug IS NULL OR slug = '') as without_slug,
  COUNT(*) as total
FROM vibelogs;
