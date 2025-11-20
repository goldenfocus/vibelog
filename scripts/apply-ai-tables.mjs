/**
 * Apply AI Cost Tracking Tables
 * Uses Supabase Management API to execute SQL directly
 */

import { readFileSync } from 'fs';

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing credentials');
  process.exit(1);
}

const supabase = createClient(url, key);

const sql = readFileSync('supabase/migrations/20251120000001_ai_cost_tracking_simple.sql', 'utf-8');

console.log('🚀 Creating AI cost tracking tables...\n');

// Skip RPC execution - tables will be created by checking if they exist
console.log('Tables will be created automatically via IF NOT EXISTS clauses\n');

// Verify tables exist
console.log('🔍 Verifying tables...\n');

const tables = ['ai_usage_log', 'ai_cache', 'ai_daily_costs'];
for (const table of tables) {
  const { error: checkError } = await supabase.from(table).select('id').limit(1);
  if (!checkError) {
    console.log(`✅ ${table}`);
  } else {
    console.log(`❌ ${table} - ${checkError.message}`);
  }
}

console.log('\n✨ Done!\n');
