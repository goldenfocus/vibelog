import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id') || user.id; // Allow viewing other users' likes if they're public

    // Fetch liked vibelogs
    const { data: likes, error: likesError } = await supabase
      .from('vibelog_likes')
      .select(
        `
        vibelog_id,
        created_at,
        vibelogs (
          id,
          title,
          slug,
          teaser,
          content,
          cover_image_url,
          created_at,
          published_at,
          view_count,
          like_count,
          share_count,
          read_time,
          user_id
        )
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (likesError) {
      console.error('Error fetching liked vibelogs:', likesError);
      return NextResponse.json({ error: 'Failed to fetch liked vibelogs' }, { status: 500 });
    }

    // Transform data to include author info
    interface VibelogWithUserId {
      user_id?: string;
      id?: string;
      title?: string;
      slug?: string;
      [key: string]: unknown;
    }
    
    // Flatten vibelogs from likes and filter out nulls
    const vibelogs = (likes?.map(l => l.vibelogs).filter(Boolean) || []) as unknown as VibelogWithUserId[];

    if (vibelogs.length > 0 && vibelogs[0]?.user_id) {
      // Fetch author profiles
      const userIds = [...new Set(vibelogs.map(v => v.user_id).filter(Boolean))] as string[];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', userIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Add author info to vibelogs
      const vibelogsWithAuthors = vibelogs.map(v => {
        const profile = v.user_id ? profilesMap.get(v.user_id) : null;
        return {
          ...v,
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
        };
      });

      return NextResponse.json({
        success: true,
        vibelogs: vibelogsWithAuthors,
        count: vibelogsWithAuthors.length,
      });
    }

    return NextResponse.json({
      success: true,
      vibelogs: [],
      count: 0,
    });
  } catch (error) {
    console.error('Error fetching liked vibelogs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
