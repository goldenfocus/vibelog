-- Migration: Backfill transcript column from transcription
-- This ensures the "Original" tab shows transcripts for existing vibelogs

-- Copy transcription data to transcript column where transcript is empty/null
UPDATE vibelogs
SET transcript = transcription
WHERE (transcript IS NULL OR transcript = '')
  AND transcription IS NOT NULL
  AND transcription != '';

-- Log how many rows were updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Backfilled transcript column for % vibelogs', updated_count;
END $$;
