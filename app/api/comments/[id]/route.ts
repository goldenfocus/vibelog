import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { rateLimit } from '@/lib/rateLimit';
import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * PATCH /api/comments/[id]
 *
 * Update a comment (text or audio)
 * Only the comment author or admin can update
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Rate limit: 50 updates per hour
    const isDev = process.env.NODE_ENV !== 'production';
    const opts = isDev
      ? { limit: 1000, window: '15 m' as const }
      : { limit: 50, window: '1 h' as const };
    const rl = await rateLimit(request, 'update-comment', opts, user.id);

    if (!rl.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many updates. Please try again later.',
          ...rl,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(((rl.reset || 0) - Date.now()) / 1000)),
          },
        }
      );
    }

    // Get request body
    const body = await request.json();
    const { content, audioUrl } = body;

    // Validate at least one field is provided
    if (content === undefined && audioUrl === undefined) {
      return NextResponse.json(
        { error: 'At least one of content or audioUrl must be provided' },
        { status: 400 }
      );
    }

    // Fetch the comment to verify ownership - RLS allows viewing public comments
    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('id, user_id, vibelog_id')
      .eq('id', id)
      .single();

    if (fetchError || !comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Check if user is admin - profiles are publicly readable
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.is_admin === true;

    // Verify user is comment author or admin
    if (comment.user_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized to update this comment' }, { status: 403 });
    }

    // Build update object
    const updates: { content?: string | null; audio_url?: string | null; updated_at: string } = {
      updated_at: new Date().toISOString(),
    };

    if (content !== undefined) {
      updates.content = content || null;
    }

    if (audioUrl !== undefined) {
      updates.audio_url = audioUrl || null;
    }

    // Update comment - RLS allows users to update their own comments
    const { data: updatedComment, error: updateError } = await supabase
      .from('comments')
      .update(updates)
      .eq('id', id)
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
      .single();

    if (updateError) {
      logger.error('Error updating comment', { error: updateError });
      return NextResponse.json(
        { error: 'Failed to update comment', details: updateError.message },
        { status: 500 }
      );
    }

    // Fetch author profile for response - profiles are publicly readable
    const { data: authorProfile } = await supabase
      .from('profiles')
      .select('username, display_name, avatar_url')
      .eq('id', updatedComment.user_id)
      .single();

    return NextResponse.json({
      success: true,
      comment: {
        ...updatedComment,
        author: authorProfile
          ? {
              username: authorProfile.username || 'user',
              display_name: authorProfile.display_name || 'User',
              avatar_url: authorProfile.avatar_url || null,
            }
          : null,
      },
    });
  } catch (error) {
    logger.error('Update comment error', error instanceof Error ? error : { error });
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/comments/[id]
 *
 * Delete a comment
 * Only the comment author or admin can delete
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Rate limit: 50 deletes per hour
    const isDev = process.env.NODE_ENV !== 'production';
    const opts = isDev
      ? { limit: 1000, window: '15 m' as const }
      : { limit: 50, window: '1 h' as const };
    const rl = await rateLimit(request, 'delete-comment', opts, user.id);

    if (!rl.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many deletes. Please try again later.',
          ...rl,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(((rl.reset || 0) - Date.now()) / 1000)),
          },
        }
      );
    }

    // Fetch the comment to verify ownership - RLS allows viewing public comments
    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Check if user is admin - profiles are publicly readable
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.is_admin === true;

    // Verify user is comment author or admin
    if (comment.user_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized to delete this comment' }, { status: 403 });
    }

    // Delete comment - RLS allows users to delete their own comments
    const { error: deleteError } = await supabase.from('comments').delete().eq('id', id);

    if (deleteError) {
      logger.error('Error deleting comment', { error: deleteError });
      return NextResponse.json(
        { error: 'Failed to delete comment', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    logger.error('Delete comment error', error instanceof Error ? error : { error });
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
