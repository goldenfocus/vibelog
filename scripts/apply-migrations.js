#!/usr/bin/env node

/**
 * Apply pending migrations directly to Supabase using SQL queries
 * This bypasses the CLI migration sync issues
 */

const fs = require('fs');
const path = require('path');

// Read credentials from .env.local
const envContent = fs.readFileSync('.env.local', 'utf-8');
const SUPABASE_URL = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const SERVICE_ROLE_KEY = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

// Migrations to apply (in order)
const migrations = [
  '012_create_comments_table.sql',
  '013_add_admin_role.sql',
  '014_create_usage_tracking.sql',
  '015_create_admin_audit_log.sql',
];

async function executeSql(sql) {
  // Use Supabase's PostgREST to execute raw SQL
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return response;
}

async function applyMigrations() {
  console.log('🚀 Starting migration process...\n');
  console.log(`📍 Target: ${SUPABASE_URL}\n`);

  for (const migrationFile of migrations) {
    console.log(`📄 Applying: ${migrationFile}`);

    try {
      // Read migration SQL
      const migrationPath = path.join(__dirname, 'supabase', 'migrations', migrationFile);
      const sql = fs.readFileSync(migrationPath, 'utf-8');

      // Execute migration
      await executeSql(sql);
      console.log(`✅ Successfully applied ${migrationFile}\n`);
    } catch (err) {
      console.error(`❌ Failed to apply ${migrationFile}:`);
      console.error(`   ${err.message}\n`);

      // For exec_sql not existing, we'll print SQL for manual execution
      if (err.message.includes('404') || err.message.includes('not found')) {
        console.log(
          `💡 The exec_sql function doesn't exist. You can manually run this SQL in Supabase Dashboard:`
        );
        console.log(
          `   Dashboard URL: ${SUPABASE_URL.replace('https://', 'https://supabase.com/dashboard/project/')}/sql/new\n`
        );
      }

      // Continue with other migrations
      console.log('   Continuing with remaining migrations...\n');
    }
  }

  console.log('\n🎉 Migration process complete!');
  console.log('\n📋 Next steps:');
  console.log(
    `   1. Verify migrations in Supabase Dashboard: ${SUPABASE_URL.replace('https://', 'https://supabase.com/dashboard/project/')}/table-editor`
  );
  console.log('   2. Set admin flags for users (yanlovez, vibeyang, yang)');
  console.log('   3. Test admin panel at /admin');
}

applyMigrations().catch(err => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
