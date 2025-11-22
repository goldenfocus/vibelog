#!/usr/bin/env node

/**
 * Check admin status for vibeyang@gmail.com
 */

const fs = require('fs');

// Read credentials from .env.local
const envContent = fs.readFileSync('.env.local', 'utf-8');
const SUPABASE_URL = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const SERVICE_ROLE_KEY = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

async function checkAdminStatus() {
  console.log('🔍 Checking admin status for vibeyang@gmail.com...\n');

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?email=eq.vibeyang@gmail.com&select=email,is_admin`,
      {
        method: 'GET',
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.length > 0) {
        console.log('✅ Profile found:');
        console.log('   Email:', data[0].email);
        console.log('   is_admin:', data[0].is_admin);

        if (data[0].is_admin === true) {
          console.log('\n🎉 Admin access is ENABLED!');
        } else {
          console.log('\n⚠️  Admin access is DISABLED');
          console.log('   The is_admin column exists but is set to false');
        }
      } else {
        console.log('❌ No profile found for vibeyang@gmail.com');
      }
    } else {
      const text = await response.text();
      console.error(`❌ Failed: ${response.status}`);
      console.error(text);
    }
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
  }
}

checkAdminStatus();
