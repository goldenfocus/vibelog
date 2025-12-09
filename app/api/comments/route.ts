import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { rateLimit } from '@/lib/rateLimit';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { MediaAttachment } from '@/types/comments';

// Generate a unique slug for comments (8 chars alphanumeric)
function generateCommentSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let slug = '';
  for (let i = 0; i < 8; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
}

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
      videoUrl?: string;
      voiceId?: string;
      parentCommentId?: string;
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
        videoUrl: formData.get('videoUrl') as string | undefined,
        voiceId: formData.get('voiceId') as string | undefined,
        parentCommentId: formData.get('parentCommentId') as string | undefined,
        attachments: formData.get('attachments')
          ? JSON.parse(formData.get('attachments') as string)
          : undefined,
      };
    }

    const { vibelogId, content, audioUrl, videoUrl, voiceId, parentCommentId, attachments } = body;

    if (!vibelogId) {
      return NextResponse.json({ error: 'vibelogId is required' }, { status: 400 });
    }

    // At least one of content, audioUrl, or videoUrl must be provided
    if (!content && !audioUrl && !videoUrl) {
      return NextResponse.json(
        { error: 'Either content, audioUrl, or videoUrl must be provided' },
        { status: 400 }
      );
    }

    // Verify vibelog exists and user can comment on it
    // Use regular client - RLS allows authenticated users to view published vibelogs
    const { data: vibelog, error: vibelogError } = await supabase
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

    // Generate unique slug for the comment
    const slug = generateCommentSlug();

    // Determine comment type for SEO
    const commentType = videoUrl ? 'Video' : audioUrl ? 'Voice' : 'Text';

    // Create comment - RLS policy allows authenticated users to insert their own comments
    // Build insert object, only including fields with values to let DB defaults work
    const insertData: Record<string, unknown> = {
      vibelog_id: vibelogId,
      user_id: user.id,
      slug,
      seo_title: `${commentType} Vibe`,
      seo_description: content?.slice(0, 160) || `${commentType} comment on VibeLog`,
    };

    // Only set optional fields if they have values
    if (content) insertData.content = content;
    if (audioUrl) insertData.audio_url = audioUrl;
    if (videoUrl) insertData.video_url = videoUrl;
    if (voiceId) insertData.voice_id = voiceId;
    if (parentCommentId) insertData.parent_comment_id = parentCommentId;
    if (attachments && attachments.length > 0) {
      insertData.attachments = attachments;
      insertData.attachment_count = attachments.length;
      insertData.has_rich_media = true;
    }

    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .insert(insertData)
      .select(
        `
        id,
        slug,
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
      logger.error('Error creating comment', {
        error: commentError,
        code: commentError.code,
        hint: commentError.hint,
        details: commentError.details,
        vibelogId,
        userId: user.id,
      });
      return NextResponse.json(
        {
          error: 'Failed to create comment',
          details: commentError.message,
          code: commentError.code,
          hint: commentError.hint,
        },
        { status: 500 }
      );
    }

    // Fetch author profile for response - profiles are publicly readable
    const { data: profile } = await supabase
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
    logger.error('Create comment error', error instanceof Error ? error : { error });
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
