#!/usr/bin/env node

/**
 * Test if production API has the prompt truncation fix
 * by checking the error message for a long prompt
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read credentials
const envContent = fs.readFileSync('.env.local', 'utf-8');
const SUPABASE_URL = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const SERVICE_ROLE_KEY = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function testProdAPI() {
  console.log('🧪 Testing production API for prompt truncation fix...\n');

  // Find a vibelog with long content
  const { data: vibelog } = await supabase
    .from('vibelogs')
    .select('id, title, content, teaser')
    .eq('id', 'bc34b382-9c48-45ae-b00f-164be1e17aaf')
    .single();

  if (!vibelog) {
    console.log('❌ Test vibelog not found');
    return;
  }

  console.log('Test vibelog:', vibelog.title);
  console.log('Content length:', vibelog.content?.length || 0);
  console.log('Teaser length:', vibelog.teaser?.length || 0);
  console.log('\n📡 Calling production API...\n');

  // Reset status first
  await supabase
    .from('vibelogs')
    .update({ video_generation_status: null, video_generation_error: null })
    .eq('id', vibelog.id);

  // Call production API
  const response = await fetch('https://www.vibelog.io/api/video/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vibelogId: vibelog.id,
      aspectRatio: '16:9',
    }),
  });

  console.log('Response status:', response.status);

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    console.log('Response (raw):', text);
    return;
  }

  console.log('Response:', JSON.stringify(data, null, 2));

  // Check the error
  if (data.error) {
    if (data.error.includes('2000 characters')) {
      console.log('\n❌ PRODUCTION STILL HAS OLD CODE');
      console.log('   The API is NOT truncating prompts');
    } else {
      console.log('\n⚠️  Different error:', data.error);
    }
  } else if (data.success) {
    console.log('\n✅ PRODUCTION HAS NEW CODE');
    console.log('   Video generation succeeded!');
  }

  // Check what was actually saved
  await new Promise(resolve => setTimeout(resolve, 2000));

  const { data: updated } = await supabase
    .from('vibelogs')
    .select('video_generation_status, video_generation_error')
    .eq('id', vibelog.id)
    .single();

  console.log('\nFinal status in DB:', updated?.video_generation_status);
  if (updated?.video_generation_error) {
    console.log('Error in DB:', updated.video_generation_error.substring(0, 200));
  }
}

testProdAPI().catch(err => {
  console.error('\n💥 Fatal error:', err);
  process.exit(1);
});
