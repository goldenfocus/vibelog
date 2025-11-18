/**
 * Delete broken video vibelogs that were created but failed to upload
 * Run with: npx tsx scripts/delete-broken-vibelogs.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deleteBrokenVibelogs() {
  try {
    console.log('🔍 Searching for broken video vibelogs...\n');

    // Find vibelogs with "video-vibelog-recording" slug pattern
    const { data: vibelogs, error: fetchError } = await supabase
      .from('vibelogs')
      .select('id, title, slug, video_url, user_id, created_at')
      .like('slug', 'video-vibelog-recording%')
      .order('created_at', { ascending: false })
      .limit(10);

    if (fetchError) {
      console.error('❌ Error fetching vibelogs:', fetchError);
      return;
    }

    if (!vibelogs || vibelogs.length === 0) {
      console.log('✅ No broken vibelogs found');
      return;
    }

    console.log(`Found ${vibelogs.length} vibelog(s) with video-vibelog-recording pattern:\n`);

    vibelogs.forEach((vibelog, index) => {
      console.log(`${index + 1}. ID: ${vibelog.id}`);
      console.log(`   Title: ${vibelog.title}`);
      console.log(`   Slug: ${vibelog.slug}`);
      console.log(`   Video URL: ${vibelog.video_url || 'NULL (broken)'}`);
      console.log(`   Created: ${vibelog.created_at}`);
      console.log('');
    });

    // Filter for truly broken ones (no video_url)
    const brokenVibelogs = vibelogs.filter(v => !v.video_url);

    if (brokenVibelogs.length === 0) {
      console.log('✅ All vibelogs have video URLs - none are broken');
      return;
    }

    console.log(`\n🗑️  Deleting ${brokenVibelogs.length} broken vibelog(s)...\n`);

    for (const vibelog of brokenVibelogs) {
      console.log(`Deleting: ${vibelog.id} (${vibelog.slug})...`);

      const { error: deleteError } = await supabase.from('vibelogs').delete().eq('id', vibelog.id);

      if (deleteError) {
        console.error(`❌ Failed to delete ${vibelog.id}:`, deleteError);
      } else {
        console.log(`✅ Deleted ${vibelog.id}`);
      }
    }

    console.log('\n✅ Cleanup complete!');
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

deleteBrokenVibelogs();
