#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const SUPABASE_URL = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const SERVICE_ROLE_KEY = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkSuccessfulVideo() {
  console.log('🔍 Checking the one successful video...\n');

  const { data: vibelog } = await supabase
    .from('vibelogs')
    .select('*')
    .eq('id', '3df7fbd2-a1d7-4eb4-9c4d-c79b015468a5')
    .single();

  if (!vibelog) {
    console.log('❌ Video not found');
    return;
  }

  console.log('Title:', vibelog.title);
  console.log('Content length:', vibelog.content?.length || 0);
  console.log('Teaser length:', vibelog.teaser?.length || 0);
  console.log('Video URL:', vibelog.video_url);
  console.log('Video status:', vibelog.video_generation_status);
  console.log('Generated at:', vibelog.video_generated_at);
  console.log('Duration:', vibelog.video_duration);
  console.log('Dimensions:', vibelog.video_width, 'x', vibelog.video_height);
}

checkSuccessfulVideo().catch(console.error);
