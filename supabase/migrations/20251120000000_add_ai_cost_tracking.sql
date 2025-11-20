-- AI Cost Tracking and Caching Infrastructure
-- This migration creates tables for tracking AI API costs, caching responses, and enforcing daily limits

-- Table 1: AI Usage Log (tracks every API call with cost and metadata)
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  service TEXT NOT NULL, -- 'whisper', 'gpt-4o-mini', 'tts-1-hd', 'dall-e-3'
  endpoint TEXT, -- API route that made the call
  estimated_cost DECIMAL(10, 6) NOT NULL, -- Cost in USD
  input_tokens INTEGER, -- For GPT models
  output_tokens INTEGER, -- For GPT models
  duration_seconds DECIMAL(10, 2), -- For Whisper
  cache_hit BOOLEAN DEFAULT FALSE, -- Whether response was from cache
  metadata JSONB, -- Additional context (prompt length, model version, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying by user and date
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user_created
  ON ai_usage_log(user_id, created_at DESC);

-- Index for querying by service and date
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_service_created
  ON ai_usage_log(service, created_at DESC);

-- Index for daily cost aggregation (using created_at directly since DATE() is not immutable)
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_created_date
  ON ai_usage_log(created_at);

-- Table 2: AI Cache (stores cached responses to avoid duplicate API calls)
CREATE TABLE IF NOT EXISTS ai_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL, -- SHA-256 hash of service + input
  service TEXT NOT NULL, -- 'transcription', 'tts', 'image', 'generation'
  response JSONB NOT NULL, -- Cached API response
  expires_at TIMESTAMPTZ NOT NULL, -- When to invalidate cache
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for cache lookups (removed WHERE clause - NOW() is not IMMUTABLE)
CREATE INDEX IF NOT EXISTS idx_ai_cache_key_expires
  ON ai_cache(cache_key, expires_at);

-- Index for cleanup of expired entries
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires
  ON ai_cache(expires_at);

-- Function to update last_accessed_at on cache hit
CREATE OR REPLACE FUNCTION update_ai_cache_access()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_accessed_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update last_accessed_at
CREATE TRIGGER ai_cache_access_trigger
  BEFORE UPDATE ON ai_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_cache_access();

-- Table 3: AI Daily Costs (aggregated daily totals with circuit breaker)
CREATE TABLE IF NOT EXISTS ai_daily_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE UNIQUE NOT NULL, -- YYYY-MM-DD
  total_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00, -- Total USD spent
  disabled_at TIMESTAMPTZ, -- When circuit breaker triggered (if exceeded limit)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for daily cost lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_daily_costs_date
  ON ai_daily_costs(date);

-- Index for checking if service is disabled
CREATE INDEX IF NOT EXISTS idx_ai_daily_costs_disabled
  ON ai_daily_costs(date, disabled_at);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_daily_costs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER ai_daily_costs_update_trigger
  BEFORE UPDATE ON ai_daily_costs
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_daily_costs_timestamp();

-- Enable Row Level Security (RLS) for privacy
ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_daily_costs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admin access only (service role can access all)
CREATE POLICY "Service role can manage ai_usage_log"
  ON ai_usage_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage ai_cache"
  ON ai_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage ai_daily_costs"
  ON ai_daily_costs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Optional: Allow authenticated users to view their own usage (read-only)
CREATE POLICY "Users can view their own ai usage"
  ON ai_usage_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Comments for documentation
COMMENT ON TABLE ai_usage_log IS 'Tracks every AI API call with cost estimation and metadata for billing analysis';
COMMENT ON TABLE ai_cache IS 'Caches AI API responses to reduce duplicate calls and costs. Uses SHA-256 hash keys.';
COMMENT ON TABLE ai_daily_costs IS 'Aggregates daily AI costs and tracks circuit breaker status when $50 limit exceeded';
COMMENT ON COLUMN ai_daily_costs.disabled_at IS 'Timestamp when daily limit was exceeded and all AI services were disabled';
