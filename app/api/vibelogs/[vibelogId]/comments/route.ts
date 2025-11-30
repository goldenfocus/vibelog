import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase';
import { createServerAdminClient } from '@/lib/supabaseAdmin';

/**
 * GET /api/vibelogs/[vibelogId]/comments
 *
 * Fetch comments for a specific vibelog with pagination
 * Query params:
 *   - limit: number of comments to fetch (default 50, max 100)
 *   - offset: number of comments to skip (for pagination)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vibelogId: string }> }
) {
  try {
    const { vibelogId } = await params;
    const { searchParams } = new URL(request.url);

    // Pagination with sensible defaults and limits
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const supabase = await createServerSupabaseClient();
    const adminSupabase = await createServerAdminClient();

    // Verify vibelog exists and is accessible
    const { data: vibelog, error: vibelogError } = await adminSupabase
      .from('vibelogs')
      .select('id, user_id, is_published, is_public')
      .eq('id', vibelogId)
      .single();

    if (vibelogError || !vibelog) {
      return NextResponse.json({ error: 'Vibelog not found' }, { status: 404 });
    }

    // Check if user can view comments
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const canView = vibelog.is_published || vibelog.user_id === user?.id;

    if (!canView) {
      return NextResponse.json(
        { error: 'Cannot view comments on unpublished vibelogs' },
        { status: 403 }
      );
    }

    // Fetch comments with pagination (including replies)
    const { data: comments, error: commentsError, count } = await adminSupabase
      .from('comments')
      .select(
        `
        id,
        vibelog_id,
        user_id,
        content,
        audio_url,
        video_url,
        voice_id,
        created_at,
        updated_at,
        parent_comment_id
      `,
        { count: 'exact' }
      )
      .eq('vibelog_id', vibelogId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (commentsError) {
      console.error('Error fetching comments:', commentsError);
      return NextResponse.json(
        { error: 'Failed to fetch comments', details: commentsError.message },
        { status: 500 }
      );
    }

    // Fetch author profiles for all comments
    const userIds = [...new Set(comments.map(c => c.user_id))];
    const { data: profiles } = await adminSupabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Combine comments with author info
    const commentsWithAuthors = comments.map(comment => ({
      ...comment,
      author: profileMap.get(comment.user_id)
        ? {
            username: profileMap.get(comment.user_id)!.username || 'user',
            display_name: profileMap.get(comment.user_id)!.display_name || 'User',
            avatar_url: profileMap.get(comment.user_id)!.avatar_url || null,
          }
        : {
            username: 'user',
            display_name: 'User',
            avatar_url: null,
          },
    }));

    return NextResponse.json({
      success: true,
      comments: commentsWithAuthors,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    console.error('Get comments error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
