import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/comments/recent
 * Fetch recent comments with vibelog and profile data for viral feed
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Fetch recent comments with related vibelog and profile data
    const { data: comments, error } = await supabase
      .from('comments')
      .select(
        `
        id,
        content,
        audio_url,
        video_url,
        slug,
        created_at,
        profiles!comments_user_id_fkey (
          id,
          username,
          full_name,
          avatar_url
        ),
        vibelogs!comments_vibelog_id_fkey (
          id,
          title,
          public_slug,
          cover_image_url,
          video_url,
          profiles!vibelogs_user_id_fkey (
            username,
            full_name
          )
        )
      `
      )
      .eq('is_public', true)
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent comments:', error);

      // If table doesn't exist yet (relation "comments" does not exist), return empty array
      if (error.message?.includes('relation') || error.code === '42P01') {
        console.log('Comments table not found - likely migration not applied yet');
        return NextResponse.json({ comments: [] });
      }

      return NextResponse.json({ error: 'Failed to fetch recent comments' }, { status: 500 });
    }

    // Transform the data for easier consumption
    const transformedComments = comments?.map(comment => {
      const profile = Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles;
      const vibelog = Array.isArray(comment.vibelogs) ? comment.vibelogs[0] : comment.vibelogs;
      const author = vibelog?.profiles
        ? Array.isArray(vibelog.profiles)
          ? vibelog.profiles[0]
          : vibelog.profiles
        : null;

      return {
        id: comment.id,
        content: comment.content,
        audioUrl: comment.audio_url,
        videoUrl: comment.video_url,
        slug: comment.slug,
        createdAt: comment.created_at,
        commentator: {
          id: profile?.id,
          username: profile?.username,
          displayName: profile?.full_name || profile?.username || 'Anonymous',
          avatarUrl: profile?.avatar_url,
        },
        vibelog: {
          id: vibelog?.id,
          title: vibelog?.title || 'Untitled',
          slug: vibelog?.public_slug,
          coverImageUrl: vibelog?.cover_image_url,
          videoUrl: vibelog?.video_url,
          author: {
            username: author?.username || 'anonymous',
            displayName: author?.full_name || author?.username || 'Anonymous',
          },
        },
      };
    });

    return NextResponse.json({ comments: transformedComments });
  } catch (error) {
    console.error('Error in recent comments API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
