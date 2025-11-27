import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = await createServerSupabaseClient();

    // Fetch published vibelogs
    const { data: vibelogs, error } = await supabase
      .from('vibelogs')
      .select(
        `
        id,
        title,
        slug,
        public_slug,
        teaser,
        content,
        cover_image_url,
        audio_url,
        video_url,
        created_at,
        published_at,
        view_count,
        like_count,
        share_count,
        read_time,
        user_id,
        original_language,
        available_languages,
        translations
      `
      )
      .eq('is_published', true)
      .eq('is_public', true)
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch vibelogs', details: error.message },
        { status: 500 }
      );
    }

    // Get unique user IDs
    const userIds = [...new Set((vibelogs || []).map((v: any) => v.user_id).filter(Boolean))];

    // Fetch profiles for all users (if any)
    const profilesMap = new Map();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', userIds);

      if (profiles) {
        profiles.forEach((profile: any) => {
          profilesMap.set(profile.id, profile);
        });
      }
    }

    // Transform data to include author info
    const transformedVibelogs = (vibelogs || []).map((vibelog: any) => {
      const profile = vibelog.user_id ? profilesMap.get(vibelog.user_id) : null;

      return {
        ...vibelog,
        author: profile
          ? {
              username: profile.username || 'user',
              display_name: profile.display_name || 'Vibelog User',
              avatar_url: profile.avatar_url || null,
            }
          : {
              username: 'anonymous',
              display_name: 'Anonymous',
              avatar_url: null,
            },
        // Keep user_id for Edit/Remix logic in VibelogActions component
      };
    });

    return NextResponse.json({
      success: true,
      vibelogs: transformedVibelogs,
      count: vibelogs.length,
      offset,
      limit,
    });
  } catch (error) {
    console.error('Get vibelogs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
