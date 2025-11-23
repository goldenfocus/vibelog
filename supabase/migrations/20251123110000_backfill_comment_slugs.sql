-- ============================================================================
-- BACKFILL COMMENT SLUGS: Generate unique slugs for all existing comments
-- ============================================================================
-- Issue: Existing comments created before slug column was added have NULL slugs
-- Solution: Generate unique slugs for all comments missing them
-- This enables comment discoverability via /c/[slug] URLs
-- ============================================================================

DO $$
DECLARE
  comment_record RECORD;
  new_slug TEXT;
  chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
  slug_length INTEGER := 8;
  max_attempts INTEGER := 100;
  attempt_count INTEGER;
  total_updated INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting comment slug backfill...';

  -- Loop through all comments without slugs
  FOR comment_record IN
    SELECT id, created_at
    FROM comments
    WHERE slug IS NULL
    ORDER BY created_at ASC  -- Oldest first
  LOOP
    attempt_count := 0;

    -- Try to generate a unique slug (with retry logic for collisions)
    LOOP
      -- Generate random slug
      new_slug := '';
      FOR i IN 1..slug_length LOOP
        new_slug := new_slug || substr(chars, 1 + (random() * (length(chars) - 1))::int, 1);
      END LOOP;

      -- Try to update with this slug
      BEGIN
        UPDATE comments
        SET slug = new_slug
        WHERE id = comment_record.id;

        -- Success! Exit retry loop
        total_updated := total_updated + 1;
        EXIT;

      EXCEPTION
        WHEN unique_violation THEN
          -- Slug collision, try again
          attempt_count := attempt_count + 1;

          IF attempt_count >= max_attempts THEN
            -- Give up after max attempts and use a UUID-based slug
            new_slug := replace(gen_random_uuid()::text, '-', '')::text;
            new_slug := substr(new_slug, 1, 12);  -- Use 12 chars from UUID

            UPDATE comments
            SET slug = new_slug
            WHERE id = comment_record.id;

            total_updated := total_updated + 1;
            RAISE NOTICE 'Used UUID fallback for comment % after % attempts', comment_record.id, max_attempts;
            EXIT;
          END IF;

          CONTINUE;  -- Try again with new random slug
      END;
    END LOOP;

    -- Progress notification every 100 comments
    IF total_updated % 100 = 0 THEN
      RAISE NOTICE 'Backfilled % comment slugs so far...', total_updated;
    END IF;
  END LOOP;

  RAISE NOTICE 'Comment slug backfill complete! Updated % comments.', total_updated;
END $$;

-- Verify all comments now have slugs
DO $$
DECLARE
  null_slug_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_slug_count FROM comments WHERE slug IS NULL;

  IF null_slug_count > 0 THEN
    RAISE WARNING 'WARNING: % comments still have NULL slugs!', null_slug_count;
  ELSE
    RAISE NOTICE 'SUCCESS: All comments now have slugs! ✓';
  END IF;
END $$;
