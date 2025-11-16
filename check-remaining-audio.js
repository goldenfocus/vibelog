#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRemainingAudio() {
  const { data, error } = await supabase
    .from('vibelogs')
    .select('id, title, audio_url')
    .not('audio_url', 'is', null);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${data.length} vibelogs with audio:\n`);
  data.forEach((vl, i) => {
    console.log(`${i + 1}. "${vl.title}"`);
    console.log(`   Audio URL: ${vl.audio_url}\n`);
  });
}

checkRemainingAudio();
