#!/usr/bin/env node

/**
 * List all profiles to find vibeyang
 */

const fs = require('fs');

// Read credentials from .env.local
const envContent = fs.readFileSync('.env.local', 'utf-8');
const SUPABASE_URL = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const SERVICE_ROLE_KEY = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

async function listProfiles() {
  console.log('📋 Fetching all profiles...\n');

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=email,username,display_name,is_admin&order=created_at.desc&limit=20`, {
      method: 'GET',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`Found ${data.length} profiles:\n`);

      data.forEach((profile, i) => {
        console.log(`${i + 1}. ${profile.display_name || 'No name'}`);
        console.log(`   Email: ${profile.email || 'No email'}`);
        console.log(`   Username: ${profile.username || 'No username'}`);
        console.log(`   is_admin: ${profile.is_admin}`);
        console.log('');
      });

      // Find vibeyang
      const vibeyang = data.find(p =>
        p.email?.includes('vibeyang') ||
        p.username?.includes('vibeyang') ||
        p.display_name?.includes('vibeyang')
      );

      if (vibeyang) {
        console.log('✅ Found vibeyang profile:');
        console.log('   Email:', vibeyang.email);
        console.log('   Username:', vibeyang.username);
        console.log('   is_admin:', vibeyang.is_admin);
      } else {
        console.log('⚠️  No profile matching "vibeyang" found');
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

listProfiles();
