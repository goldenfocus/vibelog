// Quick script to check comments in the database
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ogqcycqctxulcvhjeiii.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncWN5Y3FjdHh1bGN2aGplaWlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NTM4MTcsImV4cCI6MjA3MzIyOTgxN30.dj6Rhq0li-6iGkqf5n_wIBsYLvrnr1UVo0BbnjN9ukY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkComments() {
  console.log('🔍 Checking comments in database...\n');

  // Check total comments
  const { count: totalCount, error: countError } = await supabase
    .from('comments')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ Error counting comments:', countError);
    return;
  }

  console.log(`📊 Total comments in database: ${totalCount}`);

  // Check public approved comments
  const { count: publicCount, error: publicCountError } = await supabase
    .from('comments')
    .select('*', { count: 'exact', head: true })
    .eq('is_public', true)
    .eq('moderation_status', 'approved');

  if (publicCountError) {
    console.error('❌ Error counting public comments:', publicCountError);
  } else {
    console.log(`✅ Public + Approved comments: ${publicCount}`);
  }

  // Check moderation statuses
  const { data: statuses, error: statusError } = await supabase
    .from('comments')
    .select('moderation_status');

  if (!statusError && statuses) {
    const statusCounts = statuses.reduce((acc, s) => {
      acc[s.moderation_status || 'null'] = (acc[s.moderation_status || 'null'] || 0) + 1;
      return acc;
    }, {});
    console.log('\n📈 Comments by moderation status:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
  }

  // Check is_public values
  const { data: publicFlags, error: publicError } = await supabase
    .from('comments')
    .select('is_public');

  if (!publicError && publicFlags) {
    const publicCounts = publicFlags.reduce((acc, p) => {
      const val = p.is_public === null ? 'null' : p.is_public ? 'true' : 'false';
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {});
    console.log('\n🔒 Comments by is_public:');
    Object.entries(publicCounts).forEach(([flag, count]) => {
      console.log(`   ${flag}: ${count}`);
    });
  }

  // Fetch a few recent comments with details
  const { data: recentComments, error: recentError } = await supabase
    .from('comments')
    .select(`
      id,
      content,
      audio_url,
      video_url,
      is_public,
      moderation_status,
      created_at,
      vibelog_id,
      user_id
    `)
    .order('created_at', { ascending: false })
    .limit(5);

  if (recentError) {
    console.error('❌ Error fetching recent comments:', recentError);
  } else if (recentComments && recentComments.length > 0) {
    console.log('\n📝 Recent comments (last 5):');
    recentComments.forEach((c, i) => {
      console.log(`\n   ${i + 1}. Comment ${c.id.substring(0, 8)}...`);
      console.log(`      is_public: ${c.is_public}`);
      console.log(`      moderation_status: ${c.moderation_status}`);
      console.log(`      has content: ${!!c.content}`);
      console.log(`      has audio: ${!!c.audio_url}`);
      console.log(`      has video: ${!!c.video_url}`);
      console.log(`      vibelog_id: ${c.vibelog_id ? c.vibelog_id.substring(0, 8) + '...' : 'none'}`);
      console.log(`      user_id: ${c.user_id ? c.user_id.substring(0, 8) + '...' : 'none'}`);
      console.log(`      created: ${c.created_at}`);
    });
  } else {
    console.log('\n⚠️  No comments found in database');
  }

  // Test the exact query used by the API
  console.log('\n\n🧪 Testing exact API query...');
  const { data: apiComments, error: apiError } = await supabase
    .from('comments')
    .select(`
      id,
      content,
      audio_url,
      video_url,
      slug,
      created_at,
      profiles!comments_user_id_fkey (
        id,
        username,
        full_name,
        avatar_url
      ),
      vibelogs!comments_vibelog_id_fkey (
        id,
        title,
        public_slug,
        cover_image_url,
        video_url,
        profiles!vibelogs_user_id_fkey (
          username,
          full_name
        )
      )
    `)
    .eq('is_public', true)
    .eq('moderation_status', 'approved')
    .order('created_at', { ascending: false })
    .limit(10);

  if (apiError) {
    console.error('❌ API query error:', apiError);
  } else {
    console.log(`✅ API query returned ${apiComments?.length || 0} comments`);
    if (apiComments && apiComments.length > 0) {
      console.log('\n   Sample comment structure:');
      const sample = apiComments[0];
      console.log(`   - Has profiles: ${!!sample.profiles}`);
      console.log(`   - Has vibelogs: ${!!sample.vibelogs}`);
      if (sample.vibelogs) {
        console.log(`   - Vibelog has profiles: ${!!sample.vibelogs.profiles}`);
      }
    }
  }
}

checkComments().catch(console.error);
