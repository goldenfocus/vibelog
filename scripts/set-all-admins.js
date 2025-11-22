#!/usr/bin/env node

/**
 * Set admin flags for all intended admin users
 */

const fs = require('fs');

// Read credentials from .env.local
const envContent = fs.readFileSync('.env.local', 'utf-8');
const SUPABASE_URL = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const SERVICE_ROLE_KEY = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

// Admin users based on what we found
const adminUsers = [
  { email: 'yanik@yanik.com', username: 'vibeyang' },
  { email: 'yan@veganz.net', username: 'yanlovez' },
  { email: 'cacaoconnexions@gmail.com', username: 'yang' },
];

async function setAdminFlag(email, username) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ is_admin: true }),
      }
    );

    if (response.ok) {
      console.log(`✅ ${username} (${email}) - Admin privileges granted`);
      return true;
    } else {
      const text = await response.text();
      console.error(`❌ ${username} (${email}) - Failed: ${response.status} ${text}`);
      return false;
    }
  } catch (err) {
    console.error(`❌ ${username} (${email}) - Error: ${err.message}`);
    return false;
  }
}

async function setAllAdmins() {
  console.log('🛡️  Setting admin flags for all users...\n');

  for (const user of adminUsers) {
    await setAdminFlag(user.email, user.username);
  }

  console.log('\n🎉 Admin setup complete!');
  console.log('\n📋 Verifying...');

  // Verify
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?is_admin=eq.true&select=email,username,is_admin`,
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
    console.log(`\n✅ ${data.length} admin users confirmed:`);
    data.forEach(user => {
      console.log(`   - ${user.username} (${user.email})`);
    });
  }
}

setAllAdmins();
