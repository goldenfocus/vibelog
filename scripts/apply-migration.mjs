#!/usr/bin/env node
/**
 * Apply AI Cost Tracking Migration
 * Simple script to create the required tables in Supabase
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('❌ Missing Supabase credentials');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  console.error('\nUsage: node scripts/apply-migration.mjs');
  process.exit(1);
}

const supabase = createClient(url, key);

console.log('🚀 Applying AI Cost Tracking Migration...\n');

// Read the migration file
const sql = readFileSync('supabase/migrations/20251120000000_add_ai_cost_tracking.sql', 'utf-8');

// Split into individual statements
const statements = sql
  .split(';')
  .map((s) => s.trim())
  .filter((s) => s.length > 0 && !s.startsWith('--'));

console.log(`📝 Found ${statements.length} SQL statements\n`);

// Since Supabase doesn't expose a direct SQL execution endpoint via REST,
// we'll provide instructions for manual application
console.log('📌 MANUAL MIGRATION REQUIRED\n');
console.log('The Supabase client library does not support direct SQL execution.');
console.log('Please apply this migration manually using one of these methods:\n');

const projectRef = url.match(/https:\/\/([^.]+)/)?.[1];

console.log('METHOD 1 - Supabase Dashboard (Recommended):');
console.log(`  1. Go to: https://supabase.com/dashboard/project/${projectRef}/sql/new`);
console.log('  2. Copy and paste the entire contents of:');
console.log('     supabase/migrations/20251120000000_add_ai_cost_tracking.sql');
console.log('  3. Click "Run"\n');

console.log('METHOD 2 - Supabase CLI:');
console.log('  pnpm supabase db push\n');

console.log('METHOD 3 - Direct SQL Copy:');
console.log('  Copy the SQL below and paste it into the Supabase SQL Editor:\n');
console.log('─'.repeat(80));
console.log(sql);
console.log('─'.repeat(80));
console.log('');

// Verify tables (will fail if they don't exist yet)
console.log('🔍 Checking if tables already exist...\n');

const tables = ['ai_usage_log', 'ai_cache', 'ai_daily_costs'];
let allExist = true;

for (const table of tables) {
  const { error } = await supabase.from(table).select('id').limit(1);

  if (error) {
    console.log(`   ❌ ${table} - Not found`);
    allExist = false;
  } else {
    console.log(`   ✅ ${table} - Already exists`);
  }
}

if (allExist) {
  console.log('\n✅ All tables already exist! Migration complete.\n');
} else {
  console.log('\n⚠️  Tables need to be created. Please use one of the methods above.\n');
}

console.log('📚 Tables to be created:');
console.log('   - ai_usage_log: Track every AI API call with cost');
console.log('   - ai_cache: Cache responses for 30 days');
console.log('   - ai_daily_costs: Daily cost totals + circuit breaker\n');
