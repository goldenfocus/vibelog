const fs = require('fs');
const path = require('path');

// Read credentials
const envContent = fs.readFileSync('.env.local', 'utf-8');
const SUPABASE_URL = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const SERVICE_ROLE_KEY = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

async function runMigration() {
  console.log('🧹 Removing voice clone columns...\n');

  // Individual DROP statements for better control
  const statements = [
    'DROP INDEX IF EXISTS public.profiles_voice_clone_id_idx',
    'DROP INDEX IF EXISTS public.vibelogs_voice_clone_id_idx',
    'ALTER TABLE public.profiles DROP COLUMN IF EXISTS voice_clone_id',
    'ALTER TABLE public.profiles DROP COLUMN IF EXISTS voice_clone_name',
    'ALTER TABLE public.profiles DROP COLUMN IF EXISTS voice_cloning_enabled',
    'ALTER TABLE public.vibelogs DROP COLUMN IF EXISTS voice_clone_id',
  ];

  for (const sql of statements) {
    console.log(`📝 ${sql}`);

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
        method: 'POST',
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql }),
      });

      if (response.ok) {
        console.log('   ✅ Success\n');
      } else {
        // Try direct table manipulation via REST API for columns
        if (sql.includes('DROP COLUMN')) {
          console.log('   ⚠️  REST API method not available, use Dashboard SQL Editor\n');
        } else {
          const text = await response.text();
          console.log(`   ℹ️  ${response.status}: ${text.substring(0, 100)}\n`);
        }
      }
    } catch (err) {
      console.log(`   ⚠️  ${err.message}\n`);
    }
  }

  console.log('\n📋 Manual SQL for Supabase Dashboard:');
  console.log('─'.repeat(60));
  console.log(statements.join(';\n') + ';');
  console.log('─'.repeat(60));
  console.log('\n🔗 Run here: https://supabase.com/dashboard/project/ogqcycqctxulcvhjeiii/sql/new');
}

runMigration();
