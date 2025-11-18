/**
 * Delete duplicate "Video vibelog (recording" vibelogs
 * These were created due to a bug in the video upload API
 *
 * Run: NEXT_PUBLIC_SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx scripts/delete-duplicate-video-vibelogs.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deleteDuplicateVibelogs() {
  try {
    console.log('🔍 Finding duplicate video vibelogs...');

    // Find all vibelogs with title starting with "Video vibelog (recording"
    const { data: vibelogs, error: fetchError } = await supabase
      .from('vibelogs')
      .select('id, title, created_at, user_id, video_url')
      .like('title', 'Video vibelog (recording%')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('❌ Error fetching vibelogs:', fetchError);
      return;
    }

    if (!vibelogs || vibelogs.length === 0) {
      console.log('✅ No duplicate vibelogs found');
      return;
    }

    console.log(`📊 Found ${vibelogs.length} duplicate vibelogs:`);
    vibelogs.forEach((v, i) => {
      console.log(
        `  ${i + 1}. ${v.id} - ${v.title} (created: ${v.created_at}, has video: ${!!v.video_url})`
      );
    });

    console.log('\n🗑️  Deleting duplicate vibelogs...');

    // Delete all duplicate vibelogs
    const { error: deleteError } = await supabase
      .from('vibelogs')
      .delete()
      .like('title', 'Video vibelog (recording%');

    if (deleteError) {
      console.error('❌ Error deleting vibelogs:', deleteError);
      return;
    }

    console.log(`✅ Successfully deleted ${vibelogs.length} duplicate vibelogs`);
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

deleteDuplicateVibelogs();
