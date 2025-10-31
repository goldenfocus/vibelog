import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * GET /api/like-vibelog/[id]/users
 * Fetch list of users who liked a vibelog
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: vibelogId } = await params;
    const supabase = await createServerSupabaseClient();

    // Fetch likes with user profile information
    const { data: likes, error } = await supabase
      .from('vibelog_likes')
      .select(
        `
        created_at,
        profiles:user_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `
      )
      .eq('vibelog_id', vibelogId)
      .order('created_at', { ascending: false })
      .limit(50); // Limit to 50 most recent likes

    if (error) {
      console.error('Error fetching vibelog likers:', error);
      return NextResponse.json({ error: 'Failed to fetch likers' }, { status: 500 });
    }

    // Transform the data to a cleaner format
    const likers = (likes || [])
      .filter(like => like.profiles) // Filter out any likes without profile data
      .map(like => {
        // Supabase returns profile as an object when using foreign key relation
        const profile = like.profiles as any;
        return {
          id: profile.id,
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          liked_at: like.created_at,
        };
      });

    return NextResponse.json({
      likers,
      total: likers.length,
    });
  } catch (error) {
    console.error('Error fetching vibelog likers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
