-- Add comment_count column to vibelogs table
ALTER TABLE vibelogs ADD COLUMN IF NOT EXISTS comment_count INTEGER NOT NULL DEFAULT 0;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_vibelogs_comment_count ON vibelogs(comment_count);

-- Backfill comment_count for existing vibelogs
UPDATE vibelogs
SET comment_count = (
  SELECT COUNT(*)
  FROM comments
  WHERE comments.vibelog_id = vibelogs.id
);

-- Create function to update comment count
CREATE OR REPLACE FUNCTION update_vibelog_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment comment count
    UPDATE vibelogs
    SET comment_count = comment_count + 1
    WHERE id = NEW.vibelog_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement comment count
    UPDATE vibelogs
    SET comment_count = GREATEST(0, comment_count - 1)
    WHERE id = OLD.vibelog_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update comment count
DROP TRIGGER IF EXISTS trigger_update_comment_count ON comments;
CREATE TRIGGER trigger_update_comment_count
AFTER INSERT OR DELETE ON comments
FOR EACH ROW
EXECUTE FUNCTION update_vibelog_comment_count();

-- Add comment to document the column
COMMENT ON COLUMN vibelogs.comment_count IS 'Total number of comments on this vibelog (automatically updated via trigger)';
