const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const SUPABASE_URL = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const SERVICE_ROLE_KEY = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

async function checkTables() {
  console.log('🔍 Checking database state...\n');

  // Check for is_admin column
  console.log('1. Checking profiles.is_admin column...');
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=is_admin&limit=1`, {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    });
    if (res.ok) {
      console.log('   ✅ is_admin column EXISTS\n');
    } else {
      const error = await res.text();
      if (error.includes('column') && error.includes('does not exist')) {
        console.log('   ❌ is_admin column MISSING\n');
      } else {
        console.log('   ⚠️  Unknown:', error.substring(0, 100), '\n');
      }
    }
  } catch (e) {
    console.log('   ❌ Error:', e.message, '\n');
  }

  // Check for admin_audit_log table
  console.log('2. Checking admin_audit_log table...');
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/admin_audit_log?limit=1`, {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    });
    if (res.ok) {
      console.log('   ✅ admin_audit_log table EXISTS\n');
    } else {
      const error = await res.text();
      console.log('   ❌ admin_audit_log table MISSING\n');
    }
  } catch (e) {
    console.log('   ❌ Error:', e.message, '\n');
  }

  // Check for tts_usage_log table
  console.log('3. Checking tts_usage_log table...');
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/tts_usage_log?limit=1`, {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    });
    if (res.ok) {
      console.log('   ✅ tts_usage_log table EXISTS\n');
    } else {
      console.log('   ❌ tts_usage_log table MISSING\n');
    }
  } catch (e) {
    console.log('   ❌ Error:', e.message, '\n');
  }

  // Check for comments table
  console.log('4. Checking comments table...');
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/comments?limit=1`, {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    });
    if (res.ok) {
      console.log('   ✅ comments table EXISTS\n');
    } else {
      console.log('   ❌ comments table MISSING\n');
    }
  } catch (e) {
    console.log('   ❌ Error:', e.message, '\n');
  }

  // Check admin users
  console.log('5. Checking admin users...');
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?is_admin=eq.true&select=email,username,is_admin`,
      {
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
      }
    );
    if (res.ok) {
      const admins = await res.json();
      if (admins.length > 0) {
        console.log(`   ✅ Found ${admins.length} admin users:`);
        admins.forEach(a => console.log(`      - ${a.username} (${a.email})`));
        console.log('');
      } else {
        console.log('   ⚠️  No admin users found (need to set is_admin=true)\n');
      }
    } else {
      console.log('   ❌ Could not check admin users\n');
    }
  } catch (e) {
    console.log('   ❌ Error:', e.message, '\n');
  }

  console.log('📊 Summary:');
  console.log('   If all tables exist but no admins: run set-all-admins.js');
  console.log('   If is_admin column missing: run the profiles migration only');
  console.log('   If everything exists: try /admin now!');
}

checkTables();
