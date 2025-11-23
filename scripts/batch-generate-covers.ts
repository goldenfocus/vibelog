/**
 * Batch Cover Generation Script
 *
 * Generates AI covers for all vibelogs that don't have cover images.
 * Uses DALL-E 3 with content-aware style selection.
 *
 * Run with: npx tsx scripts/batch-generate-covers.ts
 *
 * Options:
 * - Set BATCH_SIZE to control how many to generate at once
 * - Set DRY_RUN=true to see what would be generated without actually doing it
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configuration
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '10'); // Generate 10 at a time to stay under rate limits
const DRY_RUN = process.env.DRY_RUN === 'true';
const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface BatchResult {
  total: number;
  generated: number;
  failed: number;
  skipped: number;
  errors: Array<{ vibelogId: string; error: string }>;
}

async function batchGenerateCovers() {
  console.log('🎨 Starting batch cover generation...\n');

  if (DRY_RUN) {
    console.log('🧪 DRY RUN MODE - No covers will actually be generated\n');
  }

  // Fetch vibelogs without cover images
  const { data: vibelogs, error: fetchError } = await supabase
    .from('vibelogs')
    .select('id, title, teaser, transcription, user_id, cover_image_url')
    .is('cover_image_url', null) // Only vibelogs without covers
    .order('created_at', { ascending: false })
    .limit(BATCH_SIZE);

  if (fetchError) {
    console.error('❌ Failed to fetch vibelogs:', fetchError);
    process.exit(1);
  }

  if (!vibelogs || vibelogs.length === 0) {
    console.log('✅ All vibelogs already have covers!');
    return;
  }

  console.log(
    `📊 Found ${vibelogs.length} vibelogs without covers (showing first ${BATCH_SIZE})\n`
  );

  const result: BatchResult = {
    total: vibelogs.length,
    generated: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  // Generate covers one by one (sequential to respect rate limits)
  for (const vibelog of vibelogs) {
    console.log(`\n📦 Processing: ${vibelog.title.substring(0, 50)}...`);
    console.log(`   ID: ${vibelog.id}`);

    if (!vibelog.title) {
      console.log('   ⏭️  Skipping: No title');
      result.skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log('   🧪 Would generate cover (dry run)');
      result.generated++;
      continue;
    }

    try {
      // Call the generate-cover API endpoint
      const response = await fetch(`${APP_URL}/api/generate-cover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vibelogId: vibelog.id,
          title: vibelog.title,
          teaser: vibelog.teaser,
          transcript: vibelog.transcription,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log(`   ✅ Cover generated: ${data.url}`);
      console.log(`   🎨 Style: ${data.style}`);
      result.generated++;

      // Wait 1 second between requests to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error(`   ❌ Failed: ${errorMsg}`);
      result.failed++;
      result.errors.push({
        vibelogId: vibelog.id,
        error: errorMsg,
      });

      // If we hit a rate limit, wait longer
      if (errorMsg.includes('rate limit') || errorMsg.includes('429')) {
        console.log('   ⏸️  Rate limit hit, waiting 60 seconds...');
        await new Promise(resolve => setTimeout(resolve, 60000));
      }
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 BATCH GENERATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total processed:    ${result.total}`);
  console.log(`✅ Generated:       ${result.generated}`);
  console.log(`❌ Failed:          ${result.failed}`);
  console.log(`⏭️  Skipped:         ${result.skipped}`);
  console.log('='.repeat(60));

  if (result.errors.length > 0) {
    console.log('\n❌ ERRORS:\n');
    result.errors.forEach(({ vibelogId, error }) => {
      console.log(`   ${vibelogId}: ${error}`);
    });
  }

  // Check if there are more vibelogs to process
  const { count } = await supabase
    .from('vibelogs')
    .select('id', { count: 'exact', head: true })
    .is('cover_image_url', null);

  const remaining = (count || 0) - result.generated;

  if (remaining > 0 && !DRY_RUN) {
    console.log(`\n📢 ${remaining} vibelogs still need covers.`);
    console.log(`   Run this script again to generate the next batch.`);
    console.log(`   Or increase BATCH_SIZE (currently ${BATCH_SIZE})`);
  }

  if (result.failed > 0) {
    console.log('\n⚠️  Some generations failed. Please review errors above.');
    process.exit(1);
  } else if (!DRY_RUN) {
    console.log('\n✅ Batch generation completed successfully!');
  } else {
    console.log('\n✅ Dry run completed. Set DRY_RUN=false to actually generate covers.');
  }
}

// Run the batch generation
batchGenerateCovers().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
