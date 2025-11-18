import { NextRequest, NextResponse } from 'next/server';

import { rateLimit } from '@/lib/rateLimit';
import { createServerSupabaseClient } from '@/lib/supabase';
import { createServerAdminClient } from '@/lib/supabaseAdmin';
import type { MediaAttachment } from '@/types/comments';

/**
 * POST /api/comments
 *
 * Create a new comment on a vibelog
 * Supports text comments and voice comments (with audio upload)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Rate limit: 100 comments per hour for authenticated users
    const isDev = process.env.NODE_ENV !== 'production';
    const opts = isDev
      ? { limit: 1000, window: '15 m' as const }
      : { limit: 100, window: '1 h' as const };
    const rl = await rateLimit(request, 'create-comment', opts, user.id);

    if (!rl.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many comments. Please try again later.',
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

    // Handle both JSON (text) and FormData (voice) requests
    const contentType = request.headers.get('content-type') || '';
    let body: {
      vibelogId: string;
      content?: string;
      audioUrl?: string;
      voiceId?: string;
      attachments?: MediaAttachment[];
    };

    if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      // FormData for voice comments
      const formData = await request.formData();
      body = {
        vibelogId: formData.get('vibelogId') as string,
        content: formData.get('content') as string | undefined,
        audioUrl: formData.get('audioUrl') as string | undefined,
        voiceId: formData.get('voiceId') as string | undefined,
        attachments: formData.get('attachments')
          ? JSON.parse(formData.get('attachments') as string)
          : undefined,
      };
    }

    const { vibelogId, content, audioUrl, voiceId, attachments } = body;

    if (!vibelogId) {
      return NextResponse.json({ error: 'vibelogId is required' }, { status: 400 });
    }

    // At least one of content or audioUrl must be provided
    if (!content && !audioUrl) {
      return NextResponse.json(
        { error: 'Either content or audioUrl must be provided' },
        { status: 400 }
      );
    }

    // Verify vibelog exists and user can comment on it
    const adminSupabase = await createServerAdminClient();
    const { data: vibelog, error: vibelogError } = await adminSupabase
      .from('vibelogs')
      .select('id, user_id, is_published, is_public')
      .eq('id', vibelogId)
      .single();

    if (vibelogError || !vibelog) {
      return NextResponse.json({ error: 'Vibelog not found' }, { status: 404 });
    }

    // Check if user can comment (vibelog must be published or user owns it)
    const canComment = vibelog.is_published || vibelog.user_id === user.id;
    if (!canComment) {
      return NextResponse.json(
        { error: 'Cannot comment on unpublished vibelogs' },
        { status: 403 }
      );
    }

    // Create comment
    const { data: comment, error: commentError } = await adminSupabase
      .from('comments')
      .insert({
        vibelog_id: vibelogId,
        user_id: user.id,
        content: content || null,
        audio_url: audioUrl || null,
        voice_id: voiceId || null,
        attachments: attachments && attachments.length > 0 ? attachments : null,
        attachment_count: attachments ? attachments.length : 0,
        has_rich_media: attachments && attachments.length > 0,
      })
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

    if (commentError) {
      console.error('Error creating comment:', commentError);
      return NextResponse.json(
        { error: 'Failed to create comment', details: commentError.message },
        { status: 500 }
      );
    }

    // Fetch author profile for response
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('username, display_name, avatar_url')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      success: true,
      comment: {
        ...comment,
        author: profile
          ? {
              username: profile.username || 'user',
              display_name: profile.display_name || 'User',
              avatar_url: profile.avatar_url || null,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('Create comment error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
