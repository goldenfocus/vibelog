-- Migration: Auto-update vibelog counts in profiles table
-- This trigger keeps profiles.total_vibelogs in sync with actual vibelog count

-- ============================================================================
-- STEP 1: Create trigger function to update vibelog counts
-- ============================================================================

CREATE OR REPLACE FUNCTION update_profile_vibelog_count()
RETURNS TRIGGER AS $$
BEGIN
  -- On INSERT: increment the counter
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles
    SET
      total_vibelogs = COALESCE(total_vibelogs, 0) + 1,
      updated_at = NOW()
    WHERE id = NEW.user_id AND NEW.user_id IS NOT NULL;
    RETURN NEW;

  -- On DELETE: decrement the counter
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles
    SET
      total_vibelogs = GREATEST(COALESCE(total_vibelogs, 0) - 1, 0), -- Never go below 0
      updated_at = NOW()
    WHERE id = OLD.user_id AND OLD.user_id IS NOT NULL;
    RETURN OLD;

  -- On UPDATE: handle user_id changes (claiming anonymous vibelogs)
  ELSIF TG_OP = 'UPDATE' THEN
    -- If user_id changed from NULL to a value (claiming)
    IF OLD.user_id IS NULL AND NEW.user_id IS NOT NULL THEN
      UPDATE profiles
      SET
        total_vibelogs = COALESCE(total_vibelogs, 0) + 1,
        updated_at = NOW()
      WHERE id = NEW.user_id;

    -- If user_id changed from one user to another (edge case)
    ELSIF OLD.user_id IS NOT NULL AND NEW.user_id IS NOT NULL AND OLD.user_id != NEW.user_id THEN
      -- Decrement old user
      UPDATE profiles
      SET
        total_vibelogs = GREATEST(COALESCE(total_vibelogs, 0) - 1, 0),
        updated_at = NOW()
      WHERE id = OLD.user_id;

      -- Increment new user
      UPDATE profiles
      SET
        total_vibelogs = COALESCE(total_vibelogs, 0) + 1,
        updated_at = NOW()
      WHERE id = NEW.user_id;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 2: Create trigger on vibelogs table
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_profile_vibelog_count ON vibelogs;

CREATE TRIGGER trigger_update_profile_vibelog_count
AFTER INSERT OR UPDATE OR DELETE ON vibelogs
FOR EACH ROW
EXECUTE FUNCTION update_profile_vibelog_count();

-- ============================================================================
-- STEP 3: Backfill existing vibelog counts (one-time operation)
-- ============================================================================

-- This will calculate the correct count for all users who have vibelogs
UPDATE profiles p
SET
  total_vibelogs = COALESCE(v.vibelog_count, 0),
  updated_at = NOW()
FROM (
  SELECT user_id, COUNT(*) as vibelog_count
  FROM vibelogs
  WHERE user_id IS NOT NULL
  GROUP BY user_id
) v
WHERE p.id = v.user_id;

-- Set count to 0 for users with no vibelogs (if not already 0)
UPDATE profiles
SET
  total_vibelogs = 0,
  updated_at = NOW()
WHERE id NOT IN (
  SELECT DISTINCT user_id
  FROM vibelogs
  WHERE user_id IS NOT NULL
)
AND total_vibelogs != 0;

-- ============================================================================
-- VERIFICATION QUERY (for manual testing)
-- ============================================================================

-- Run this to verify counts are correct:
-- SELECT
--   p.username,
--   p.total_vibelogs as stored_count,
--   COUNT(v.id) as actual_count,
--   CASE
--     WHEN p.total_vibelogs = COUNT(v.id) THEN '✅ Match'
--     ELSE '❌ Mismatch'
--   END as status
-- FROM profiles p
-- LEFT JOIN vibelogs v ON v.user_id = p.id
-- WHERE p.username IS NOT NULL
-- GROUP BY p.id, p.username, p.total_vibelogs
-- ORDER BY p.username;
