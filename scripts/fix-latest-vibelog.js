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

async function fixVibelog() {
  const vibelogId = '3df7fbd2-a1d7-4eb4-9c4d-c79b015468a5';
  const userId = '72fc8fd0-5d64-4563-ba6c-a74c99dac695';
  const audioPath =
    'users/72fc8fd0-5d64-4563-ba6c-a74c99dac695/audio/session_1763223931546_yqy5u6-f8e73252.webm';
  const audioUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/vibelogs/${audioPath}`;

  console.log('🎵 Updating vibelog with audio...');
  console.log('Vibelog ID:', vibelogId);
  console.log('Audio URL:', audioUrl);
  console.log('');

  // Update the vibelog
  const { error: updateError } = await supabase
    .from('vibelogs')
    .update({
      audio_url: audioUrl,
      audio_duration: 42, // Approximate from file size
    })
    .eq('id', vibelogId);

  if (updateError) {
    console.error('❌ Failed to update vibelog:', updateError);
    return;
  }

  console.log('✅ Successfully updated vibelog!');

  // Verify
  const { data, error } = await supabase
    .from('vibelogs')
    .select('id, title, audio_url, audio_duration')
    .eq('id', vibelogId)
    .single();

  console.log('\n📊 Updated vibelog:');
  console.log(JSON.stringify(data, null, 2));
}

fixVibelog().catch(console.error);
