#!/usr/bin/env node

/**
 * Check video generation error for a specific vibelog
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const vibelogId = process.argv[2] || 'bc34b382-9c48-45ae-b00f-164be1e17aaf';

// Read credentials from .env.local
const envContent = fs.readFileSync('.env.local', 'utf-8');
const SUPABASE_URL = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const SERVICE_ROLE_KEY = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkError() {
  console.log('🔍 Checking video generation error...\n');

  const { data: vibelog, error } = await supabase
    .from('vibelogs')
    .select('id, title, video_generation_status, video_generation_error, video_url')
    .eq('id', vibelogId)
    .single();

  if (error) {
    console.error('❌ Error fetching vibelog:', error);
    process.exit(1);
  }

  if (!vibelog) {
    console.log('⚠️  Vibelog not found!');
    process.exit(0);
  }

  console.log('Title:', vibelog.title);
  console.log('Status:', vibelog.video_generation_status || 'none');
  console.log('Has video:', !!vibelog.video_url);
  console.log('\nError:', vibelog.video_generation_error || 'No error');
}

checkError().catch(err => {
  console.error('\n💥 Fatal error:', err);
  process.exit(1);
});
