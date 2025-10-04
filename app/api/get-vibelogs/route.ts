import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = await createServerSupabaseClient();

    // Fetch published vibelogs with author info
    const { data: vibelogs, error } = await supabase
      .from('vibelogs')
      .select(
        `
        id,
        title,
        teaser,
        content,
        cover_image_url,
        created_at,
        published_at,
        view_count,
        like_count,
        share_count,
        read_time,
        user_id,
        profiles (
          username,
          display_name,
          avatar_url
        )
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

    // Transform data to include author info
    const transformedVibelogs = (vibelogs || []).map((vibelog: any) => {
      // profiles is returned as an array or object depending on relationship
      const profile = Array.isArray(vibelog.profiles) ? vibelog.profiles[0] : vibelog.profiles;

      return {
        ...vibelog,
        author:
          vibelog.user_id && profile
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
        // Remove the profiles join data
        profiles: undefined,
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
