-- List all vibelogs that need covers
-- Copy the IDs and manually trigger generation via the UI or API

SELECT
  id,
  title,
  SUBSTRING(teaser, 1, 100) as teaser_preview,
  created_at,
  '/v/' || slug as url
FROM vibelogs
WHERE cover_image_url IS NULL
ORDER BY created_at DESC
LIMIT 50;

-- Count total vibelogs needing covers
SELECT COUNT(*) as total_needing_covers
FROM vibelogs
WHERE cover_image_url IS NULL;
