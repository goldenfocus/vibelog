#!/usr/bin/env node
/**
 * Clear expired DALL-E image URLs from vibelogs
 *
 * DALL-E temporary URLs from oaidalleapiprodscus.blob.core.windows.net expire after ~2 hours
 * This script finds all vibelogs with expired DALL-E URLs and sets their cover_image_url to null
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env.local');

try {
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
} catch (error) {
  console.error('⚠️  Could not load .env.local file:', error.message);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Check if a URL is an expired DALL-E temporary URL
 */
function isExpiredDalleUrl(url) {
  if (!url) return false;
  return url.includes('oaidalleapiprodscus.blob.core.windows.net');
}

async function clearExpiredDalleUrls() {
  console.log('🔍 Searching for vibelogs with expired DALL-E URLs...\n');

  // Fetch all vibelogs with cover_image_url
  const { data: vibelogs, error: fetchError } = await supabase
    .from('vibelogs')
    .select('id, title, cover_image_url, created_at')
    .not('cover_image_url', 'is', null)
    .order('created_at', { ascending: false });

  if (fetchError) {
    console.error('❌ Error fetching vibelogs:', fetchError);
    process.exit(1);
  }

  console.log(`📊 Found ${vibelogs.length} vibelogs with cover images`);

  // Filter for expired DALL-E URLs
  const expiredVibelogs = vibelogs.filter(v => isExpiredDalleUrl(v.cover_image_url));

  console.log(`⚠️  Found ${expiredVibelogs.length} vibelogs with expired DALL-E URLs\n`);

  if (expiredVibelogs.length === 0) {
    console.log('✅ No expired DALL-E URLs found. Database is clean!');
    return;
  }

  // Show first 10 examples
  console.log('📋 Examples of vibelogs with expired URLs:');
  expiredVibelogs.slice(0, 10).forEach((v, i) => {
    console.log(`   ${i + 1}. "${v.title.substring(0, 50)}${v.title.length > 50 ? '...' : ''}"`);
    console.log(`      URL: ${v.cover_image_url.substring(0, 80)}...`);
    console.log(`      Created: ${new Date(v.created_at).toLocaleString()}\n`);
  });

  if (expiredVibelogs.length > 10) {
    console.log(`   ... and ${expiredVibelogs.length - 10} more\n`);
  }

  // Ask for confirmation (in non-interactive mode, use --yes flag)
  const shouldClear = process.argv.includes('--yes');

  if (!shouldClear) {
    console.log('⚠️  DRY RUN MODE - No changes will be made');
    console.log('   To clear these URLs, run with --yes flag:');
    console.log('   node scripts/clear-expired-dalle-urls.mjs --yes\n');
    return;
  }

  console.log('🔄 Clearing expired DALL-E URLs...\n');

  // Update all expired vibelogs to set cover_image_url to null
  let successCount = 0;
  let errorCount = 0;

  for (const vibelog of expiredVibelogs) {
    const { error: updateError } = await supabase
      .from('vibelogs')
      .update({ cover_image_url: null })
      .eq('id', vibelog.id);

    if (updateError) {
      console.error(`❌ Error updating vibelog ${vibelog.id}:`, updateError);
      errorCount++;
    } else {
      successCount++;
    }
  }

  console.log(`\n✅ Successfully cleared ${successCount} expired DALL-E URLs`);
  if (errorCount > 0) {
    console.log(`❌ Failed to clear ${errorCount} URLs`);
  }
}

// Run the script
clearExpiredDalleUrls().catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});
