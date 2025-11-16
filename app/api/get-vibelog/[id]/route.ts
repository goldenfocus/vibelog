import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const supabase = await createServerSupabaseClient();

    // Fetch the vibelog
    const { data: vibelog, error } = await supabase
      .from('vibelogs')
      .select(
        `
        id,
        title,
        slug,
        teaser,
        content,
        cover_image_url,
        audio_url,
        created_at,
        published_at,
        view_count,
        like_count,
        share_count,
        read_time,
        user_id,
        is_published,
        is_public
      `
      )
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return NextResponse.json({ error: 'Vibelog not found' }, { status: 404 });
      }
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch vibelog', details: error.message },
        { status: 500 }
      );
    }

    if (!vibelog) {
      return NextResponse.json({ error: 'Vibelog not found' }, { status: 404 });
    }

    // Check if vibelog is public or user owns it
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const isOwner = user && vibelog.user_id === user.id;
    const isPublic = vibelog.is_published && vibelog.is_public;

    if (!isOwner && !isPublic) {
      return NextResponse.json(
        { error: 'This vibelog is private. Sign in to view.' },
        { status: 403 }
      );
    }

    // Fetch author profile if vibelog has a user_id
    let profile = null;
    if (vibelog.user_id) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, display_name, avatar_url')
        .eq('id', vibelog.user_id)
        .single();

      profile = profileData;
    }

    // Transform data to include author info
    const transformedVibelog = {
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
      // Remove internal fields
      user_id: undefined, // Don't expose user_id to client
      is_published: undefined,
      is_public: undefined,
    };

    return NextResponse.json({
      success: true,
      vibelog: transformedVibelog,
    });
  } catch (error) {
    console.error('Get vibelog error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
