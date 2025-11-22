// Quick script to check if Twitter auto-posting migration was applied
// Run with: node check-migration.js

const fs = require('fs');
const path = require('path');

const { createClient } = require('@supabase/supabase-js');

// Manually load .env.local
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      process.env[key] = value;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMigration() {
  console.log('🔍 Checking Twitter auto-posting migration...\n');

  // Check if vibelog_social_posts table exists
  const { data: tables, error: tableError } = await supabase
    .from('vibelog_social_posts')
    .select('*')
    .limit(1);

  if (tableError) {
    if (tableError.code === '42P01') {
      console.log('❌ Table vibelog_social_posts does NOT exist');
      console.log('   The migration has NOT been applied to your database\n');
      return false;
    } else {
      console.log('❌ Error checking table:', tableError.message);
      return false;
    }
  }

  console.log('✅ Table vibelog_social_posts exists');

  // Check if profile columns exist
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('auto_post_twitter, twitter_post_format, twitter_custom_template')
    .limit(1)
    .maybeSingle();

  if (profileError) {
    console.log('❌ Profile columns missing:', profileError.message);
    console.log('   The migration is INCOMPLETE\n');
    return false;
  }

  console.log(
    '✅ Profile columns (auto_post_twitter, twitter_post_format, twitter_custom_template) exist'
  );
  console.log('\n🎉 Migration successfully applied!');
  console.log('   You should now see the Twitter Auto-Posting section in Settings → Profile\n');
  return true;
}

checkMigration()
  .then(success => {
    if (!success) {
      console.log('📝 Next steps:');
      console.log('   1. Go to https://supabase.com/dashboard');
      console.log('   2. Select your project');
      console.log('   3. Click SQL Editor');
      console.log('   4. Copy contents of apply-018-migration.sql');
      console.log('   5. Paste and click Run\n');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
