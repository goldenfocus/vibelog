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

    // Log total likes fetched before filtering
    const totalLikes = (likes || []).length;
    console.log('Fetched likes from database:', { vibelogId, totalLikes });

    // Check for likes with missing profile data
    const likesWithoutProfiles = (likes || []).filter(like => !like.profiles);
    if (likesWithoutProfiles.length > 0) {
      console.error('Found likes with missing profile data:', {
        vibelogId,
        count: likesWithoutProfiles.length,
        likes: likesWithoutProfiles,
      });
    }

    // Transform the data to a cleaner format
    const likers = (likes || [])
      .filter(like => {
        if (!like.profiles) {
          console.warn('Filtering out like with no profile data:', like);
          return false;
        }
        return true;
      })
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

    // Verify count matches vibelog.like_count for data integrity
    const { data: vibelog } = await supabase
      .from('vibelogs')
      .select('like_count')
      .eq('id', vibelogId)
      .maybeSingle();

    const actualCount = likers.length;
    const vibelogCount = vibelog?.like_count || 0;

    if (actualCount !== vibelogCount) {
      console.warn('Like count mismatch detected in likers API:', {
        vibelogId,
        actualLikers: actualCount,
        vibelogCount,
      });
    }

    return NextResponse.json({
      likers,
      total: actualCount, // Use actual count from likes table (source of truth)
      vibelog_count: vibelogCount, // Also return vibelog's count for debugging
    });
  } catch (error) {
    console.error('Error fetching vibelog likers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
