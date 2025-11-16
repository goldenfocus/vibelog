#!/usr/bin/env node

/**
 * Admin Setup Helper
 * Sets admin flags for specified users after migrations are applied
 */

const fs = require('fs');

// Read credentials from .env.local
const envContent = fs.readFileSync('.env.local', 'utf-8');
const SUPABASE_URL = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const SERVICE_ROLE_KEY = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

// Admin users to configure
const adminEmails = ['yanlovez@gmail.com', 'vibeyang@gmail.com', 'yang@anthropic.com'];

async function setAdminFlags() {
  console.log('🛡️  Setting up admin users...\n');

  for (const email of adminEmails) {
    try {
      // Update profile to set is_admin = true
      const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}`, {
        method: 'PATCH',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ is_admin: true })
      });

      if (response.ok) {
        console.log(`✅ ${email} - Admin privileges granted`);
      } else {
        const text = await response.text();
        console.error(`❌ ${email} - Failed: ${response.status} ${text}`);
      }

    } catch (err) {
      console.error(`❌ ${email} - Error: ${err.message}`);
    }
  }

  console.log('\n🎉 Admin setup complete!');
  console.log('\n📋 Next steps:');
  console.log('   1. Log in as one of the admin users');
  console.log('   2. Visit /admin to access the admin panel');
  console.log('   3. Verify all admin features work correctly');
}

console.log('⚠️  Before running this script, make sure you have:');
console.log('   1. Applied all migrations from consolidated-migrations.sql');
console.log('   2. Verified the is_admin column exists in the profiles table\n');

console.log('Starting in 3 seconds... (Ctrl+C to cancel)\n');

setTimeout(() => {
  setAdminFlags().catch(err => {
    console.error('\n💥 Fatal error:', err.message);
    process.exit(1);
  });
}, 3000);
