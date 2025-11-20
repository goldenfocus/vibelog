-- AI Cost Tracking Tables (Simplified for direct execution)

-- Table 1: AI Usage Log
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
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_created_date ON ai_usage_log(DATE(created_at));

-- Table 2: AI Cache
CREATE TABLE IF NOT EXISTS ai_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  service TEXT NOT NULL,
  response JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_cache_key_expires ON ai_cache(cache_key, expires_at) WHERE expires_at > NOW();
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires ON ai_cache(expires_at);

-- Table 3: AI Daily Costs
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

-- Enable RLS
ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_daily_costs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_usage_log' AND policyname = 'Service role can manage ai_usage_log') THEN
    CREATE POLICY "Service role can manage ai_usage_log" ON ai_usage_log FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_cache' AND policyname = 'Service role can manage ai_cache') THEN
    CREATE POLICY "Service role can manage ai_cache" ON ai_cache FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_daily_costs' AND policyname = 'Service role can manage ai_daily_costs') THEN
    CREATE POLICY "Service role can manage ai_daily_costs" ON ai_daily_costs FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_usage_log' AND policyname = 'Users can view their own ai usage') THEN
    CREATE POLICY "Users can view their own ai usage" ON ai_usage_log FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;
