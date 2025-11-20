-- ================================================================
-- AI COST TRACKING MIGRATION
-- Paste this entire file into Supabase SQL Editor and click "Run"
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new
-- ================================================================

-- Table 1: AI Usage Log (tracks every API call)
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  service TEXT NOT NULL,
  endpoint TEXT,
  estimated_cost DECIMAL(10, 6) NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  duration_seconds DECIMAL(10, 2),
  cache_hit BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user_created ON ai_usage_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_service_created ON ai_usage_log(service, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_created_date ON ai_usage_log(created_at);

-- Table 2: AI Cache (stores cached responses)
CREATE TABLE IF NOT EXISTS ai_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  service TEXT NOT NULL,
  response JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Removed partial index with NOW() predicate (not IMMUTABLE)
-- Query performance is still good with full index on (cache_key, expires_at)
CREATE INDEX IF NOT EXISTS idx_ai_cache_key_expires ON ai_cache(cache_key, expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires ON ai_cache(expires_at);

-- Table 3: AI Daily Costs (aggregate daily totals + circuit breaker)
CREATE TABLE IF NOT EXISTS ai_daily_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE UNIQUE NOT NULL,
  total_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  disabled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_daily_costs_date ON ai_daily_costs(date);
CREATE INDEX IF NOT EXISTS idx_ai_daily_costs_disabled ON ai_daily_costs(date, disabled_at);

-- Enable Row Level Security
ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_daily_costs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Service role can manage everything
DROP POLICY IF EXISTS "Service role can manage ai_usage_log" ON ai_usage_log;
CREATE POLICY "Service role can manage ai_usage_log"
  ON ai_usage_log FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage ai_cache" ON ai_cache;
CREATE POLICY "Service role can manage ai_cache"
  ON ai_cache FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage ai_daily_costs" ON ai_daily_costs;
CREATE POLICY "Service role can manage ai_daily_costs"
  ON ai_daily_costs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- RLS Policy: Users can view their own usage
DROP POLICY IF EXISTS "Users can view their own ai usage" ON ai_usage_log;
CREATE POLICY "Users can view their own ai usage"
  ON ai_usage_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Table comments for documentation
COMMENT ON TABLE ai_usage_log IS 'Tracks every AI API call with cost estimation and metadata for billing analysis';
COMMENT ON TABLE ai_cache IS 'Caches AI API responses to reduce duplicate calls and costs. Uses SHA-256 hash keys.';
COMMENT ON TABLE ai_daily_costs IS 'Aggregates daily AI costs and tracks circuit breaker status when $50 limit exceeded';
COMMENT ON COLUMN ai_daily_costs.disabled_at IS 'Timestamp when daily limit was exceeded and all AI services were disabled';

-- ================================================================
-- MIGRATION COMPLETE!
--
-- Three tables created:
--   ✅ ai_usage_log - Tracks every API call with cost
--   ✅ ai_cache - 30-day caching for transcriptions, TTS, images
--   ✅ ai_daily_costs - Daily totals + $50 circuit breaker
--
-- Next: Test transcription API and monitor costs in ai_usage_log
-- ================================================================
