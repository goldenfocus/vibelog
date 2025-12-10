-- Add media_type column to vibelogs for distinguishing voice recordings from music uploads
-- media_type: 'voice' (default, recorded), 'music' (uploaded audio), 'music_video' (uploaded video)

ALTER TABLE vibelogs
ADD COLUMN IF NOT EXISTS media_type text DEFAULT 'voice';

-- Add constraint to ensure valid values
ALTER TABLE vibelogs
ADD CONSTRAINT vibelogs_media_type_check
CHECK (media_type IN ('voice', 'music', 'music_video'));

-- Index for filtering by media type (useful for music-only feeds in future)
CREATE INDEX IF NOT EXISTS idx_vibelogs_media_type ON vibelogs(media_type);

-- Add index for combined queries (user's music vibelogs)
CREATE INDEX IF NOT EXISTS idx_vibelogs_user_media_type ON vibelogs(user_id, media_type);

COMMENT ON COLUMN vibelogs.media_type IS 'Type of media: voice (recorded), music (uploaded audio), music_video (uploaded video)';
