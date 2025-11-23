/**
 * Generate AI covers for vibelogs missing cover images
 *
 * This script creates a temporary function that calls the generate-cover API
 * for each vibelog that doesn't have a cover image.
 *
 * Usage:
 *   psql -h db.xxx.supabase.co -U postgres -d postgres -f scripts/generate-missing-covers.sql
 *
 * Or via Supabase dashboard SQL editor:
 *   Just paste this entire file and run it
 */

-- Create a temporary function to generate covers
CREATE OR REPLACE FUNCTION generate_missing_covers(batch_size INT DEFAULT 10)
RETURNS TABLE(
  vibelog_id UUID,
  status TEXT,
  message TEXT
) AS $$
DECLARE
  v_record RECORD;
  v_response TEXT;
  v_count INT := 0;
BEGIN
  -- Loop through vibelogs without covers (limit to batch_size)
  FOR v_record IN
    SELECT id, title, teaser, transcription
    FROM vibelogs
    WHERE cover_image_url IS NULL
    ORDER BY created_at DESC
    LIMIT batch_size
  LOOP
    BEGIN
      -- Call the generate-cover API endpoint using http extension
      -- Note: You need to enable the http extension first if not already enabled
      -- CREATE EXTENSION IF NOT EXISTS http;

      SELECT content INTO v_response
      FROM http((
        'POST',
        'https://vibelog.io/api/generate-cover',
        ARRAY[http_header('Content-Type', 'application/json')],
        'application/json',
        json_build_object(
          'vibelogId', v_record.id,
          'title', v_record.title,
          'teaser', v_record.teaser,
          'transcript', v_record.transcription
        )::text
      )::http_request);

      v_count := v_count + 1;

      RETURN QUERY SELECT
        v_record.id,
        'success'::TEXT,
        'Cover generation initiated'::TEXT;

      -- Wait 1 second between requests to avoid rate limits
      PERFORM pg_sleep(1);

    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT
        v_record.id,
        'error'::TEXT,
        SQLERRM::TEXT;
    END;
  END LOOP;

  RAISE NOTICE 'Processed % vibelogs', v_count;
END;
$$ LANGUAGE plpgsql;

-- Run the function for the first 10 vibelogs
SELECT * FROM generate_missing_covers(10);

-- To run for more vibelogs, increase the batch size:
-- SELECT * FROM generate_missing_covers(20);

-- To see how many vibelogs still need covers:
-- SELECT COUNT(*) FROM vibelogs WHERE cover_image_url IS NULL;

-- Drop the function when done (optional)
-- DROP FUNCTION IF EXISTS generate_missing_covers(INT);
