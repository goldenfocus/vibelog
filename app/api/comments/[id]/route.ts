import { NextRequest, NextResponse } from 'next/server';

import { rateLimit } from '@/lib/rateLimit';
import { createServerSupabaseClient } from '@/lib/supabase';
import { createServerAdminClient } from '@/lib/supabaseAdmin';

/**
 * PATCH /api/comments/[id]
 *
 * Update a comment (text or audio)
 * Only the comment author or admin can update
 */
export async function PATCH(
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

    const adminSupabase = await createServerAdminClient();

    // Fetch the comment to verify ownership
    const { data: comment, error: fetchError } = await adminSupabase
      .from('comments')
      .select('id, user_id, vibelog_id')
      .eq('id', id)
      .single();

    if (fetchError || !comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Check if user is admin
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.is_admin === true;

    // Verify user is comment author or admin
    if (comment.user_id !== user.id && !isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized to update this comment' },
        { status: 403 }
      );
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

    // Update comment
    const { data: updatedComment, error: updateError } = await adminSupabase
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
      console.error('Error updating comment:', updateError);
      return NextResponse.json(
        { error: 'Failed to update comment', details: updateError.message },
        { status: 500 }
      );
    }

    // Fetch author profile for response
    const { data: authorProfile } = await adminSupabase
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
    console.error('Update comment error:', error);
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

    const adminSupabase = await createServerAdminClient();

    // Fetch the comment to verify ownership
    const { data: comment, error: fetchError } = await adminSupabase
      .from('comments')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Check if user is admin
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.is_admin === true;

    // Verify user is comment author or admin
    if (comment.user_id !== user.id && !isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this comment' },
        { status: 403 }
      );
    }

    // Delete comment
    const { error: deleteError } = await adminSupabase.from('comments').delete().eq('id', id);

    if (deleteError) {
      console.error('Error deleting comment:', deleteError);
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
    console.error('Delete comment error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
