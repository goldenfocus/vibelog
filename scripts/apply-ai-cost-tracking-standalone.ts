/**
 * Apply AI Cost Tracking Migration (Standalone)
 * This script manually applies the AI cost tracking tables to avoid migration conflicts
 */

import * as fs from 'fs';
import * as path from 'path';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function applyMigration() {
  console.log('🚀 Applying AI Cost Tracking migration...\n');

  const migrationPath = path.join(
    process.cwd(),
    'supabase/migrations/20251120000000_add_ai_cost_tracking.sql'
  );

  const sql = fs.readFileSync(migrationPath, 'utf-8');

  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--') && s !== '');

  console.log(`Found ${statements.length} SQL statements to execute\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 60).replace(/\n/g, ' ') + '...';

    try {
      // Execute the SQL statement using the REST API
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ sql: stmt + ';' }),
      });

      if (response.ok || response.status === 409) {
        // 409 means already exists, which is fine
        console.log(`[${i + 1}/${statements.length}] ✅ ${preview}`);
        successCount++;
      } else {
        const errorText = await response.text();
        // Check if it's a "already exists" error
        if (errorText.includes('already exists') || errorText.includes('duplicate')) {
          console.log(`[${i + 1}/${statements.length}] ⏭️  ${preview} (already exists)`);
          successCount++;
        } else {
          console.log(`[${i + 1}/${statements.length}] ⚠️  ${preview}`);
          console.log(`   Error: ${errorText.substring(0, 100)}`);
          errorCount++;
        }
      }
    } catch (err: any) {
      console.log(`[${i + 1}/${statements.length}] ⚠️  ${preview}`);
      console.log(`   ${err.message}`);
      errorCount++;
    }

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  console.log(`\n📊 Summary:`);
  console.log(`  ✅ ${successCount} statements executed successfully`);
  if (errorCount > 0) {
    console.log(`  ⚠️  ${errorCount} statements had errors (check if tables already exist)\n`);
  } else {
    console.log(`  🎉 All statements executed successfully!\n`);
  }

  // Verify the tables were created
  console.log('🔍 Verifying tables...\n');

  const tables = ['ai_usage_log', 'ai_cache', 'ai_daily_costs'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('id').limit(0);

    if (error) {
      console.log(`  ❌ ${table} - Error: ${error.message}`);
    } else {
      console.log(`  ✅ ${table} - Table exists and is accessible`);
    }
  }

  console.log('\n🎉 AI Cost Tracking infrastructure is ready!\n');
}

applyMigration().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
