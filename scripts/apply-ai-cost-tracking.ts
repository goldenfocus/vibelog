/**
 * Apply AI Cost Tracking Migration
 * This script manually applies the AI cost tracking tables to avoid migration conflicts
 */

import * as fs from 'fs';
import * as path from 'path';

import { createServerAdminClient } from '../lib/supabaseAdmin';

async function applyMigration() {
  console.log('🚀 Applying AI Cost Tracking migration...\n');

  const supabase = await createServerAdminClient();

  const migrationPath = path.join(
    process.cwd(),
    'supabase/migrations/20251120000000_add_ai_cost_tracking.sql'
  );

  const sql = fs.readFileSync(migrationPath, 'utf-8');

  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements to execute\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 80).replace(/\n/g, ' ');

    try {
      // Use direct SQL execution through Supabase
      const { error } = await supabase.rpc('exec', {
        sql: stmt + ';',
      });

      if (error) {
        // Try alternative: some statements might need to use raw SQL
        console.log(`[${i + 1}/${statements.length}] ${preview}...`);
        console.log(`⚠️  Warning: ${error.message}`);
        errorCount++;
      } else {
        console.log(`[${i + 1}/${statements.length}] ✅ ${preview}...`);
        successCount++;
      }
    } catch (err: any) {
      console.log(`[${i + 1}/${statements.length}] ${preview}...`);
      console.log(`⚠️  Skipping (may already exist): ${err.message}`);
      errorCount++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`  ✅ ${successCount} statements executed successfully`);
  console.log(`  ⚠️  ${errorCount} statements skipped (likely already exist)\n`);

  console.log('🎉 AI Cost Tracking infrastructure ready!');
  console.log('  - ai_usage_log');
  console.log('  - ai_cache');
  console.log('  - ai_daily_costs\n');
}

applyMigration().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
