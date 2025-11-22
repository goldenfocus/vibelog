#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const { createClient } = require('@supabase/supabase-js');

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

async function findAudio() {
  const userId = '87f25873-9ea0-4c02-bd56-1b16dfd8f8d9';
  const vibelogCreatedAt = new Date('2025-11-15T16:03:59.831659+00:00');

  console.log('🔍 Looking for audio files around', vibelogCreatedAt.toISOString());
  console.log('');

  // List files in user's audio folder
  const { data: userAudio, error: userError } = await supabase.storage
    .from('vibelogs')
    .list(`users/${userId}/audio`, { sortBy: { column: 'created_at', order: 'desc' } });

  console.log('📁 User audio folder:', userAudio?.length || 0, 'files');
  if (userAudio && userAudio.length > 0) {
    console.log('Recent files:');
    userAudio.slice(0, 10).forEach(f => {
      const fileTime = new Date(f.created_at);
      const timeDiff = Math.abs(fileTime - vibelogCreatedAt) / 1000; // seconds
      console.log(`  - ${f.name}`);
      console.log(`    Created: ${f.created_at} (${timeDiff.toFixed(0)}s from vibelog)`);
      console.log(`    Size: ${f.metadata?.size || 'unknown'} bytes`);
      console.log('');
    });
  }

  // Also check sessions folder
  const { data: sessionAudio, error: sessionError } = await supabase.storage
    .from('vibelogs')
    .list('sessions', { sortBy: { column: 'created_at', order: 'desc' } });

  console.log('📁 Sessions audio folder:', sessionAudio?.length || 0, 'files');
  if (sessionAudio && sessionAudio.length > 0) {
    console.log('Recent files:');
    sessionAudio.slice(0, 10).forEach(f => {
      const fileTime = new Date(f.created_at);
      const timeDiff = Math.abs(fileTime - vibelogCreatedAt) / 1000; // seconds
      console.log(`  - ${f.name}`);
      console.log(`    Created: ${f.created_at} (${timeDiff.toFixed(0)}s from vibelog)`);
      console.log(`    Size: ${f.metadata?.size || 'unknown'} bytes`);
      console.log('');
    });
  }

  // Also check old vibelog-covers bucket
  const { data: coversAudio, error: coversError } = await supabase.storage
    .from('vibelog-covers')
    .list(`users/${userId}/audio`, { sortBy: { column: 'created_at', order: 'desc' } });

  if (coversAudio && coversAudio.length > 0) {
    console.log('📁 OLD vibelog-covers/users audio folder:', coversAudio.length, 'files');
    console.log('Recent files:');
    coversAudio.slice(0, 10).forEach(f => {
      const fileTime = new Date(f.created_at);
      const timeDiff = Math.abs(fileTime - vibelogCreatedAt) / 1000; // seconds
      console.log(`  - ${f.name}`);
      console.log(`    Created: ${f.created_at} (${timeDiff.toFixed(0)}s from vibelog)`);
      console.log('');
    });
  }
}

findAudio().catch(console.error);
