import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase';
import { createServerAdminClient } from '@/lib/supabaseAdmin';

/**
 * GET /api/comments/[vibelogId]
 *
 * Fetch all comments for a specific vibelog
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vibelogId: string }> }
) {
  try {
    const { vibelogId } = await params;

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

    // Fetch comments with author profiles
    const { data: comments, error: commentsError } = await adminSupabase
      .from('comments')
      .select(
        `
        id,
        vibelog_id,
        user_id,
        content,
        audio_url,
        voice_id,
        created_at,
        updated_at
      `
      )
      .eq('vibelog_id', vibelogId)
      .order('created_at', { ascending: true });

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
