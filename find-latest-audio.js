#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findLatestAudio() {
  // Your user ID
  const userId = '72fc8fd0-5d64-4563-ba6c-a74c99dac695';

  console.log('🔍 Looking for latest audio files...\n');

  // Check vibelogs bucket
  const { data: vibelogsAudio, error: vibelogsError } = await supabase.storage
    .from('vibelogs')
    .list(`users/${userId}/audio`, { sortBy: { column: 'created_at', order: 'desc' } });

  if (vibelogsAudio && vibelogsAudio.length > 0) {
    console.log('📁 Vibelogs bucket - Latest 5 files:');
    vibelogsAudio.slice(0, 5).forEach(f => {
      console.log(`  - ${f.name}`);
      console.log(`    Created: ${f.created_at}`);
      console.log(`    Size: ${f.metadata?.size || 'unknown'} bytes\n`);
    });
  }

  // Check vibelog-covers bucket (old location)
  const { data: coversAudio, error: coversError } = await supabase.storage
    .from('vibelog-covers')
    .list(`users/${userId}/audio`, { sortBy: { column: 'created_at', order: 'desc' } });

  if (coversAudio && coversAudio.length > 0) {
    console.log('📁 Vibelog-covers bucket - Latest 5 files:');
    coversAudio.slice(0, 5).forEach(f => {
      console.log(`  - ${f.name}`);
      console.log(`    Created: ${f.created_at}`);
      console.log(`    Size: ${f.metadata?.size || 'unknown'} bytes\n`);
    });
  }
}

findLatestAudio().catch(console.error);
