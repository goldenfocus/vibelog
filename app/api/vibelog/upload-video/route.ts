/**
 * Video Upload API Route
 * POST /api/vibelog/upload-video
 * Handles user-uploaded videos (not AI-generated)
 * Pattern: Follows audio upload with ownership verification
 */

import crypto from 'crypto';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { logger } from '@/lib/logger';
import { VIBELOGS_BUCKET } from '@/lib/storage';
import { createServerSupabaseClient } from '@/lib/supabase';
import { createServerAdminClient } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';

// Configure route to accept large request bodies (up to 50MB)
export const maxDuration = 60; // 60 seconds for upload
// Note: Body size limits are controlled by Vercel plan (100MB for Pro, 4.5MB for Hobby)
// For larger files, we'll need to upgrade to Pro or use alternative upload methods

// Validation schema
const UploadVideoSchema = z.object({
  vibelogId: z.string().uuid(),
  source: z.enum(['captured', 'uploaded']).optional().default('uploaded'),
});

// Video validation constants
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB
const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime', // .mov
  'video/webm',
  'video/x-msvideo', // .avi
  'video/mpeg',
];

function generateVideoPath(vibelogId: string, userId: string, originalName: string): string {
  const timestamp = Date.now();
  const hash = crypto
    .createHash('sha1')
    .update(`${vibelogId}-${timestamp}`)
    .digest('hex')
    .slice(0, 8);

  // Extract extension from original filename
  const ext = originalName.split('.').pop()?.toLowerCase() || 'mp4';

  return `users/${userId}/video/${vibelogId}/${timestamp}-${hash}.${ext}`;
}

export async function POST(request: NextRequest) {
  let vibelogId: string | undefined;

  try {
    // Parse form data
    const formData = await request.formData();
    const videoFile = formData.get('video') as File;
    const vibelogIdParam = formData.get('vibelogId') as string;
    const sourceParam = formData.get('source') as string | null;

    // Validate inputs
    if (!videoFile) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }

    const validated = UploadVideoSchema.parse({
      vibelogId: vibelogIdParam,
      source: sourceParam || 'uploaded',
    });
    vibelogId = validated.vibelogId;
    const videoSource = validated.source;

    // SECURITY: Get user from session, NEVER trust client-supplied userId
    const supabaseClient = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    logger.info('Uploading video', {
      fileName: videoFile.name,
      fileSize: videoFile.size,
      fileType: videoFile.type,
      vibelogId,
      userId: user.id,
      source: videoSource,
    });

    // Use admin client for storage operations (requires service role to bypass storage RLS)
    const supabase = await createServerAdminClient();

    // Validate file size
    if (videoFile.size > MAX_VIDEO_SIZE) {
      return NextResponse.json(
        {
          error: 'Video file too large',
          details: `Maximum file size is 500MB. Your file is ${(videoFile.size / (1024 * 1024)).toFixed(1)}MB`,
        },
        { status: 413 }
      );
    }

    // Validate file type
    const contentType = (videoFile.type || '').split(';')[0].trim();
    if (!ALLOWED_VIDEO_TYPES.includes(contentType)) {
      return NextResponse.json(
        {
          error: 'Invalid video format',
          details: `Supported formats: MP4, MOV, WebM. You uploaded: ${contentType}`,
        },
        { status: 415 }
      );
    }

    // Verify vibelog ownership
    const { data: vibelog, error: fetchError } = await supabase
      .from('vibelogs')
      .select('id, user_id, title')
      .eq('id', vibelogId)
      .single();

    if (fetchError || !vibelog) {
      return NextResponse.json({ error: 'Vibelog not found' }, { status: 404 });
    }

    if (vibelog.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to upload videos to this vibelog' },
        { status: 403 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await videoFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate storage path
    const path = generateVideoPath(vibelogId, user.id, videoFile.name);

    // Upload to Supabase Storage (using admin client already created above)
    const { error: uploadError } = await supabase.storage
      .from(VIBELOGS_BUCKET)
      .upload(path, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      logger.error('Storage upload failed', { error: uploadError, vibelogId });
      throw uploadError;
    }

    // Generate public URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const url = supabaseUrl
      ? `${supabaseUrl}/storage/v1/object/public/${VIBELOGS_BUCKET}/${path}`
      : `/${path}`;

    // Update vibelog with video URL and metadata
    const { error: updateError } = await supabase
      .from('vibelogs')
      .update({
        video_url: url,
        video_source: videoSource, // 'captured' = camera recording, 'uploaded' = file upload
        video_uploaded_at: new Date().toISOString(),
      })
      .eq('id', vibelogId);

    if (updateError) {
      logger.error('Database update failed', { error: updateError, vibelogId });
      // Try to clean up the uploaded file
      await supabase.storage.from(VIBELOGS_BUCKET).remove([path]);
      throw updateError;
    }

    logger.info('Video upload successful', {
      url,
      path,
      bucket: VIBELOGS_BUCKET,
      size: buffer.length,
      vibelogId,
    });

    return NextResponse.json({
      success: true,
      url,
      path,
      size: buffer.length,
      vibelogId,
    });
  } catch (error: unknown) {
    logger.error('Video upload failed', {
      error: error instanceof Error ? error.message : String(error),
      vibelogId,
    });

    const errorMessage = error instanceof Error ? error.message : 'Failed to upload video';
    return NextResponse.json(
      {
        error: 'Failed to upload video',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
