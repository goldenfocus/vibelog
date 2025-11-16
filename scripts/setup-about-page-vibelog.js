#!/usr/bin/env node

/**
 * Setup script to create the special "about-page" vibelog for comments
 *
 * This vibelog is used as a container for comments on the /about page
 * It should only be run once by an admin
 *
 * Usage:
 *   node scripts/setup-about-page-vibelog.js
 */

const fs = require('fs');
const path = require('path');

// Read credentials from environment or .env.local
let SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
let SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  try {
    const envPath = path.join(__dirname, '../.env.local');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    SUPABASE_URL = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
    SERVICE_ROLE_KEY = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
  } catch (err) {
    console.error('❌ Error: Could not load environment variables');
    console.error('   Either set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    console.error('   or create a .env.local file in the project root');
    process.exit(1);
  }
}

async function setupAboutPageVibelog() {
  console.log('🚀 Setting up about-page vibelog for comments...\n');

  try {
    // Get the vibeyang user
    const profileResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?username=eq.vibeyang&select=id,username`,
      {
        method: 'GET',
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!profileResponse.ok) {
      console.error('❌ Error fetching @vibeyang profile');
      const text = await profileResponse.text();
      console.error(text);
      process.exit(1);
    }

    const profiles = await profileResponse.json();

    if (profiles.length === 0) {
      console.error('❌ Error: Could not find @vibeyang profile');
      console.error('   Make sure the user exists in the database');
      process.exit(1);
    }

    const profile = profiles[0];
    console.log(`✅ Found @vibeyang profile (ID: ${profile.id})\n`);

    // Check if about-page vibelog already exists
    const checkResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/vibelogs?slug=eq.about-page-comments&select=id,title,slug`,
      {
        method: 'GET',
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (checkResponse.ok) {
      const existing = await checkResponse.json();
      if (existing.length > 0) {
        console.log('✅ About-page vibelog already exists:');
        console.log(`   ID: ${existing[0].id}`);
        console.log(`   Title: ${existing[0].title}`);
        console.log(`   Slug: ${existing[0].slug}\n`);
        console.log('✨ No action needed!\n');
        return;
      }
    }

    // Create the about-page vibelog
    const createResponse = await fetch(`${SUPABASE_URL}/rest/v1/vibelogs`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        user_id: profile.id,
        title: 'About Page Comments',
        slug: 'about-page-comments',
        content: 'This is a special vibelog used as a container for comments on the About page.',
        teaser: 'Comments for the About page',
        is_published: true,
        is_public: true,
        published_at: new Date().toISOString(),
      }),
    });

    if (!createResponse.ok) {
      console.error('❌ Error creating about-page vibelog');
      const text = await createResponse.text();
      console.error(text);
      process.exit(1);
    }

    const vibelogs = await createResponse.json();
    const vibelog = vibelogs[0];

    console.log('✅ Successfully created about-page vibelog:');
    console.log(`   ID: ${vibelog.id}`);
    console.log(`   Title: ${vibelog.title}`);
    console.log(`   Slug: ${vibelog.slug}\n`);
    console.log('✨ Setup complete!\n');
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

setupAboutPageVibelog();
