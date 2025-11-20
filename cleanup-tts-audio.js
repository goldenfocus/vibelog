#!/usr/bin/env node

/**
 * Cleanup TTS Audio URLs from Database
 *
 * This script removes all TTS-generated audio URLs from vibelogs.
 * TTS audio URLs contain 'tts-audio' in the path.
 * Original voice recordings (containing 'voices') are preserved.
 */

const fs = require('fs');
const path = require('path');

const { createClient } = require('@supabase/supabase-js');

// Load .env.local manually
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupTTSAudio() {
  console.log('🔍 Checking for TTS audio URLs...\n');

  // First, count how many vibelogs have TTS audio
  const { data: ttsVibelogs, error: countError } = await supabase
    .from('vibelogs')
    .select('id, title, audio_url, user_id')
    .like('audio_url', '%tts-audio%');

  if (countError) {
    console.error('❌ Error counting TTS audio:', countError);
    process.exit(1);
  }

  console.log(`Found ${ttsVibelogs.length} vibelogs with TTS audio URLs\n`);

  if (ttsVibelogs.length === 0) {
    console.log('✅ No TTS audio URLs found. Database is clean!');
    return;
  }

  // Show sample
  console.log('Sample TTS audio URLs to be removed:');
  ttsVibelogs.slice(0, 5).forEach((vl, i) => {
    console.log(`  ${i + 1}. "${vl.title}" - ${vl.audio_url}`);
  });
  console.log('');

  // Confirm before proceeding
  console.log('⚠️  This will set audio_url to NULL for these vibelogs.');
  console.log('⚠️  Original voice recordings (in "voices" bucket) will NOT be affected.\n');

  // Update all TTS audio URLs to NULL
  const { error: updateError } = await supabase
    .from('vibelogs')
    .update({ audio_url: null })
    .like('audio_url', '%tts-audio%');

  if (updateError) {
    console.error('❌ Error updating vibelogs:', updateError);
    process.exit(1);
  }

  console.log(`✅ Successfully removed ${ttsVibelogs.length} TTS audio URLs\n`);

  // Verify cleanup
  const { data: remainingTTS } = await supabase
    .from('vibelogs')
    .select('id')
    .like('audio_url', '%tts-audio%');

  console.log(`✅ Remaining TTS audio URLs: ${remainingTTS?.length || 0}\n`);

  // Show summary
  const { data: summary } = await supabase
    .from('vibelogs')
    .select('audio_url');

  const total = summary.length;
  const withAudio = summary.filter(v => v.audio_url).length;
  const originalVoice = summary.filter(v => v.audio_url?.includes('voices')).length;
  const noAudio = summary.filter(v => !v.audio_url).length;

  console.log('📊 Database Summary:');
  console.log(`   Total vibelogs: ${total}`);
  console.log(`   With audio: ${withAudio}`);
  console.log(`   Original voice recordings: ${originalVoice}`);
  console.log(`   No audio: ${noAudio}`);
  console.log('');
  console.log('✅ Cleanup complete! All shimmer TTS audio URLs removed.');
}

cleanupTTSAudio().catch(console.error);
