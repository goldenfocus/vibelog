/**
 * Migration Script: Standardize Cover Image Paths
 *
 * This script migrates all existing cover images to the standardized path structure:
 * OLD: vibelog-covers/covers/{filename}.jpg
 *      vibelog-covers/cover-{id}.png
 *      vibelog-covers/posts/{id}/cover-{timestamp}.jpg
 * NEW: vibelog-covers/covers/{vibelogId}.{ext}
 *
 * Run with: npx tsx scripts/migrate-cover-paths.ts
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

const BUCKET_NAME = 'vibelog-covers';
const NEW_DIR = 'covers';

interface MigrationResult {
  total: number;
  migrated: number;
  skipped: number;
  failed: number;
  errors: Array<{ vibelogId: string; error: string }>;
}

async function migrateCovers() {
  console.log('🚀 Starting cover image path migration...\n');

  // Fetch all vibelogs with cover images
  const { data: vibelogs, error: fetchError } = await supabase
    .from('vibelogs')
    .select('id, cover_image_url, title')
    .not('cover_image_url', 'is', null)
    .order('created_at', { ascending: false });

  if (fetchError) {
    console.error('❌ Failed to fetch vibelogs:', fetchError);
    process.exit(1);
  }

  if (!vibelogs || vibelogs.length === 0) {
    console.log('ℹ️  No vibelogs with cover images found.');
    return;
  }

  console.log(`📊 Found ${vibelogs.length} vibelogs with cover images\n`);

  const result: MigrationResult = {
    total: vibelogs.length,
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  for (const vibelog of vibelogs) {
    if (!vibelog.cover_image_url) continue;

    const vibelogId = vibelog.id;
    const oldUrl = vibelog.cover_image_url;

    try {
      // Skip if URL doesn't point to our storage bucket
      if (!oldUrl.includes(BUCKET_NAME)) {
        console.log(`⏭️  Skipping external URL: ${vibelogId}`);
        result.skipped++;
        continue;
      }

      // Extract the old path from URL
      // URL format: https://{project}.supabase.co/storage/v1/object/public/vibelog-covers/{PATH}
      const urlParts = oldUrl.split(`/public/${BUCKET_NAME}/`);
      if (urlParts.length < 2) {
        console.warn(`⚠️  Could not parse URL for ${vibelogId}: ${oldUrl}`);
        result.skipped++;
        continue;
      }

      const oldPath = urlParts[1];

      // Determine file extension
      const extension = oldPath.toLowerCase().endsWith('.jpg') ? 'jpg' : 'png';

      // New standardized path
      const newPath = `${NEW_DIR}/${vibelogId}.${extension}`;

      // Skip if already in correct format
      if (oldPath === newPath) {
        console.log(`✅ Already migrated: ${vibelogId}`);
        result.skipped++;
        continue;
      }

      console.log(`📦 Migrating: ${vibelogId}`);
      console.log(`   FROM: ${oldPath}`);
      console.log(`   TO:   ${newPath}`);

      // Download the file from old path
      const { data: fileData, error: downloadError } = await supabase.storage
        .from(BUCKET_NAME)
        .download(oldPath);

      if (downloadError || !fileData) {
        console.error(`   ❌ Download failed: ${downloadError?.message || 'No data'}`);
        result.failed++;
        result.errors.push({ vibelogId, error: downloadError?.message || 'Download failed' });
        continue;
      }

      // Upload to new path
      const buffer = await fileData.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(newPath, Buffer.from(buffer), {
          contentType: extension === 'jpg' ? 'image/jpeg' : 'image/png',
          cacheControl: '31536000',
          upsert: true,
        });

      if (uploadError) {
        console.error(`   ❌ Upload failed: ${uploadError.message}`);
        result.failed++;
        result.errors.push({ vibelogId, error: uploadError.message });
        continue;
      }

      // Get new public URL
      const {
        data: { publicUrl: newUrl },
      } = supabase.storage.from(BUCKET_NAME).getPublicUrl(newPath);

      // Update database with new URL
      const { error: updateError } = await supabase
        .from('vibelogs')
        .update({ cover_image_url: newUrl })
        .eq('id', vibelogId);

      if (updateError) {
        console.error(`   ❌ Database update failed: ${updateError.message}`);
        result.failed++;
        result.errors.push({ vibelogId, error: updateError.message });
        continue;
      }

      // Delete old file (only if path is different)
      if (oldPath !== newPath) {
        const { error: deleteError } = await supabase.storage.from(BUCKET_NAME).remove([oldPath]);

        if (deleteError) {
          console.warn(`   ⚠️  Warning: Could not delete old file: ${deleteError.message}`);
          // Don't count as failure - the important part (new file) succeeded
        }
      }

      console.log(`   ✅ Migrated successfully`);
      result.migrated++;
    } catch (err) {
      console.error(`   ❌ Unexpected error:`, err);
      result.failed++;
      result.errors.push({
        vibelogId,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total vibelogs:     ${result.total}`);
  console.log(`✅ Migrated:        ${result.migrated}`);
  console.log(`⏭️  Skipped:         ${result.skipped}`);
  console.log(`❌ Failed:          ${result.failed}`);
  console.log('='.repeat(60));

  if (result.errors.length > 0) {
    console.log('\n❌ ERRORS:\n');
    result.errors.forEach(({ vibelogId, error }) => {
      console.log(`   ${vibelogId}: ${error}`);
    });
  }

  if (result.failed > 0) {
    console.log('\n⚠️  Some migrations failed. Please review errors above.');
    process.exit(1);
  } else {
    console.log('\n✅ Migration completed successfully!');
  }
}

// Run migration
migrateCovers().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
