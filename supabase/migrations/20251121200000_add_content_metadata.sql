-- Add content metadata columns for SEO and discoverability
-- These fields are populated by AI content extraction

-- Add primary_topic column (main category)
ALTER TABLE vibelogs
ADD COLUMN IF NOT EXISTS primary_topic TEXT;

-- Add seo_keywords column (array of search keywords)
ALTER TABLE vibelogs
ADD COLUMN IF NOT EXISTS seo_keywords TEXT[];

-- Add entities column (extracted named entities as JSONB)
ALTER TABLE vibelogs
ADD COLUMN IF NOT EXISTS entities JSONB;

-- Add content_confidence column (AI extraction confidence score)
ALTER TABLE vibelogs
ADD COLUMN IF NOT EXISTS content_confidence NUMERIC(3,2);

-- Create index on primary_topic for topic-based queries
CREATE INDEX IF NOT EXISTS idx_vibelogs_primary_topic
ON vibelogs(primary_topic)
WHERE primary_topic IS NOT NULL;

-- Create GIN index on tags for array containment queries
CREATE INDEX IF NOT EXISTS idx_vibelogs_tags_gin
ON vibelogs USING GIN(tags);

-- Create GIN index on seo_keywords for search
CREATE INDEX IF NOT EXISTS idx_vibelogs_seo_keywords_gin
ON vibelogs USING GIN(seo_keywords);

-- Comment on columns
COMMENT ON COLUMN vibelogs.primary_topic IS 'Primary topic/category (e.g., technology, personal-growth)';
COMMENT ON COLUMN vibelogs.seo_keywords IS 'SEO-optimized keywords for search discoverability';
COMMENT ON COLUMN vibelogs.entities IS 'Extracted named entities (people, places, organizations, products)';
COMMENT ON COLUMN vibelogs.content_confidence IS 'AI extraction confidence score (0-1)';
