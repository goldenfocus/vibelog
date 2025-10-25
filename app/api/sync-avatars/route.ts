import { NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase';

export const runtime = 'nodejs';

// One-time endpoint to sync OAuth avatars from auth.users to profiles.avatar_url
export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();

    // Get current user (admin check could be added here)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all users via auth admin API
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('Error fetching auth users:', authError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    const users = authData.users;
    console.log(`🔄 Found ${users.length} users to sync avatars`);

    let updated = 0;
    const results = [];

    for (const authUser of users) {
      const avatarUrl =
        authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null;

      if (avatarUrl) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', authUser.id);

        if (updateError) {
          console.error(`Error updating ${authUser.id}:`, updateError);
          results.push({ id: authUser.id, email: authUser.email, error: updateError.message });
        } else {
          updated++;
          results.push({ id: authUser.id, email: authUser.email, success: true });
          console.log(`✅ Updated avatar for ${authUser.email}`);
        }
      }
    }

    console.log(`✨ Done! Updated ${updated}/${users.length} profiles`);

    return NextResponse.json({
      success: true,
      message: `Synced ${updated} avatars`,
      total: users.length,
      updated,
      results,
    });
  } catch (error: any) {
    console.error('Sync avatars error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
