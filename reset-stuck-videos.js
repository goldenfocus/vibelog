#!/usr/bin/env node

/**
 * Reset stuck video generation statuses
 * Run this to fix vibelogs stuck in 'generating' state
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read credentials from .env.local
const envContent = fs.readFileSync('.env.local', 'utf-8');
const SUPABASE_URL = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const SERVICE_ROLE_KEY = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function resetStuckVideos() {
  console.log('🔍 Finding vibelogs stuck in "generating" status...\n');

  // Find all vibelogs stuck in generating
  const { data: stuck, error: findError } = await supabase
    .from('vibelogs')
    .select('id, title, video_generation_status, created_at')
    .eq('video_generation_status', 'generating');

  if (findError) {
    console.error('❌ Error finding stuck videos:', findError);
    process.exit(1);
  }

  if (!stuck || stuck.length === 0) {
    console.log('✅ No stuck videos found!');
    process.exit(0);
  }

  console.log(`Found ${stuck.length} stuck video(s):\n`);
  stuck.forEach((v, i) => {
    console.log(`${i + 1}. ${v.title} (${v.id})`);
  });

  console.log('\n🔧 Resetting statuses to null...\n');

  // Reset all to null
  const { error: updateError } = await supabase
    .from('vibelogs')
    .update({
      video_generation_status: null,
      video_generation_error: null,
    })
    .eq('video_generation_status', 'generating');

  if (updateError) {
    console.error('❌ Error resetting statuses:', updateError);
    process.exit(1);
  }

  console.log(`✅ Reset ${stuck.length} video generation status(es)!`);
  console.log('\n📝 You can now try generating videos again.');
}

resetStuckVideos().catch(err => {
  console.error('\n💥 Fatal error:', err);
  process.exit(1);
});
