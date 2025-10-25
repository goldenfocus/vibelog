// One-time script to sync OAuth avatars to profiles table
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables!');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

async function syncAvatars() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('🔄 Syncing OAuth avatars to profiles...');

  // Fetch all auth users with avatar metadata
  const {
    data: { users },
    error: usersError,
  } = await supabase.auth.admin.listUsers();

  if (usersError) {
    console.error('Error fetching users:', usersError);
    return;
  }

  console.log(`Found ${users.length} users to process`);

  let updated = 0;
  for (const user of users) {
    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

    if (avatarUrl) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (updateError) {
        console.error(`Error updating user ${user.id}:`, updateError);
      } else {
        updated++;
        console.log(`✅ Updated avatar for ${user.email || user.id}`);
      }
    }
  }

  console.log(`\n✨ Done! Updated ${updated} profiles with avatars`);
}

syncAvatars().catch(console.error);
