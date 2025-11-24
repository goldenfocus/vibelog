// Test different ways to join comments with profiles
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ogqcycqctxulcvhjeiii.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncWN5Y3FjdHh1bGN2aGplaWlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NTM4MTcsImV4cCI6MjA3MzIyOTgxN30.dj6Rhq0li-6iGkqf5n_wIBsYLvrnr1UVo0BbnjN9ukY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testJoins() {
  console.log('🧪 Testing comment-profile joins...\n');

  // Method 1: Get comments and profiles separately then join in app
  console.log('Method 1: Separate queries');
  const { data: comments1 } = await supabase
    .from('comments')
    .select('id, user_id, content, created_at')
    .eq('is_public', true)
    .eq('moderation_status', 'approved')
    .limit(2);

  if (comments1 && comments1.length > 0) {
    const userIds = comments1.map(c => c.user_id);
    const { data: profiles1 } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', userIds);

    console.log('✅ Got', comments1.length, 'comments and', profiles1?.length, 'profiles');
    console.log('Sample:', {
      comment: comments1[0],
      profile: profiles1?.[0]
    });
  }

  // Method 2: Try using inner join syntax
  console.log('\n\nMethod 2: Inner join with profiles!inner');
  const { data: comments2, error: error2 } = await supabase
    .from('comments')
    .select(`
      id,
      content,
      user_id,
      created_at,
      profiles!inner(id, username, full_name, avatar_url)
    `)
    .eq('is_public', true)
    .eq('moderation_status', 'approved')
    .limit(2);

  if (error2) {
    console.log('❌ Error:', error2.message);
  } else {
    console.log('✅ Got', comments2?.length, 'comments with profiles');
    if (comments2 && comments2.length > 0) {
      console.log('Sample:', JSON.stringify(comments2[0], null, 2));
    }
  }
}

testJoins().catch(console.error);
