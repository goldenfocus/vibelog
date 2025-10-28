import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Debug endpoint to test vibelog queries
 * Usage: /api/debug-vibelog?username=vibeyang&slug=the-bitter-truth-love-hurts-f0a44883
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const username = searchParams.get('username');
  const slug = searchParams.get('slug');

  if (!username || !slug) {
    return NextResponse.json({ error: 'Missing username or slug' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  // Step 1: Find user
  console.log('🔍 Looking up user:', username);
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .eq('username', username)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      {
        step: 'profile_lookup',
        success: false,
        error: profileError,
        query: { username },
      },
      { status: 404 }
    );
  }

  console.log('✅ User found:', profile);

  // Step 2: Find vibelog
  console.log('🔍 Looking up vibelog:', slug);
  const { data: vibelog, error: vibelogError } = await supabase
    .from('vibelogs')
    .select('id, title, slug, is_published, is_public, user_id')
    .eq('slug', slug)
    .eq('user_id', profile.id)
    .eq('is_published', true)
    .eq('is_public', true)
    .single();

  if (vibelogError || !vibelog) {
    return NextResponse.json(
      {
        step: 'vibelog_lookup',
        success: false,
        error: vibelogError,
        query: {
          slug,
          user_id: profile.id,
          is_published: true,
          is_public: true,
        },
      },
      { status: 404 }
    );
  }

  console.log('✅ Vibelog found:', vibelog);

  return NextResponse.json({
    success: true,
    profile,
    vibelog,
  });
}
