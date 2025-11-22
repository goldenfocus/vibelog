#!/usr/bin/env node

/**
 * Set admin flag for vibeyang@gmail.com in production
 */

const fs = require('fs');

// Read credentials from .env.local
const envContent = fs.readFileSync('.env.local', 'utf-8');
const SUPABASE_URL = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const SERVICE_ROLE_KEY = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

async function setAdminFlag() {
  console.log('🔐 Setting admin flag for vibeyang@gmail.com...\n');

  try {
    // Update profile to set is_admin = true
    const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?email=eq.vibeyang@gmail.com`, {
      method: 'PATCH',
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ is_admin: true }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Admin flag set successfully!');
      console.log('   User:', data[0]?.email);
      console.log('   is_admin:', data[0]?.is_admin);
      console.log('\n🎉 You can now access /admin');
    } else {
      const text = await response.text();
      console.error(`❌ Failed: ${response.status} ${text}`);

      if (response.status === 406) {
        console.log('\n💡 The is_admin column might not exist yet.');
        console.log('   Run this SQL in Supabase Dashboard:');
        console.log('   ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;');
      }
    }
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
  }
}

setAdminFlag();
