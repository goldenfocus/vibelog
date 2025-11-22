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

async function check() {
  const { data } = await supabase
    .from('vibelogs')
    .select('title, teaser, content')
    .eq('slug', 'the-human-touch-in-viblogs-3df7fbd2')
    .single();

  console.log('Title:', data.title);
  console.log('\nTeaser length:', data.teaser?.length || 0);
  console.log('Teaser preview:', data.teaser?.substring(0, 300) || 'EMPTY');
  console.log('\nContent length:', data.content?.length || 0);
  console.log('Content preview:', data.content?.substring(0, 300));
}

check().catch(console.error);
