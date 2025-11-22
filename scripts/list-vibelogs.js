#!/usr/bin/env node

/**
 * List vibelogs to find one to test video generation with
 */

const fs = require('fs');

const { createClient } = require('@supabase/supabase-js');

// Read credentials from .env.local
const envContent = fs.readFileSync('.env.local', 'utf-8');
const SUPABASE_URL = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const SERVICE_ROLE_KEY = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function listVibelogs() {
  console.log('📋 Listing recent vibelogs...\n');

  const { data: vibelogs, error } = await supabase
    .from('vibelogs')
    .select(
      'id, title, teaser, content, cover_image_url, video_url, video_generation_status, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Error listing vibelogs:', error);
    process.exit(1);
  }

  if (!vibelogs || vibelogs.length === 0) {
    console.log('⚠️  No vibelogs found!');
    process.exit(0);
  }

  console.log(`Found ${vibelogs.length} recent vibelog(s):\n`);
  vibelogs.forEach((vl, i) => {
    console.log(`${i + 1}. ${vl.title}`);
    console.log(`   ID: ${vl.id}`);
    console.log(`   Has content: ${!!vl.content} (${vl.content?.length || 0} chars)`);
    console.log(`   Has teaser: ${!!vl.teaser} (${vl.teaser?.length || 0} chars)`);
    console.log(`   Has cover image: ${!!vl.cover_image_url}`);
    console.log(`   Video status: ${vl.video_generation_status || 'none'}`);
    console.log(`   Has video: ${!!vl.video_url}`);
    console.log(`   Created: ${new Date(vl.created_at).toLocaleString()}`);
    console.log('');
  });

  // Find a good candidate for video generation
  const candidate = vibelogs.find(
    vl => !vl.video_url && vl.video_generation_status !== 'generating' && (vl.content || vl.teaser)
  );

  if (candidate) {
    console.log('💡 Good candidate for video generation:');
    console.log(`   Title: ${candidate.title}`);
    console.log(`   ID: ${candidate.id}`);
    console.log(`\n🎬 To test, run:`);
    console.log(`   node test-video-generation.js ${candidate.id}`);
  } else {
    console.log('⚠️  No good candidates found for video generation.');
    console.log('   All vibelogs either have videos or are missing content.');
  }
}

listVibelogs().catch(err => {
  console.error('\n💥 Fatal error:', err);
  process.exit(1);
});
