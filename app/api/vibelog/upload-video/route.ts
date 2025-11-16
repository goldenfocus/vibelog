/**
 * Video Upload API Route
 * POST /api/vibelog/upload-video
 * Handles user-uploaded videos (not AI-generated)
 * Pattern: Follows audio upload with ownership verification
 */

import crypto from 'crypto';

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { VIBELOGS_BUCKET } from '@/lib/storage';
import { createServerSupabaseClient } from '@/lib/supabase';
import { createServerAdminClient } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';

// Validation schema
const UploadVideoSchema = z.object({
  vibelogId: z.string().uuid(),
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

    // Validate inputs
    if (!videoFile) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }

    const validated = UploadVideoSchema.parse({ vibelogId: vibelogIdParam });
    vibelogId = validated.vibelogId;

    // SECURITY: Get user from session, NEVER trust client-supplied userId
    const supabaseClient = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // PREMIUM GATE: Only premium users can upload videos
    // Free users must use camera capture instead
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_tier, is_premium')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('🎬 [VIDEO-UPLOAD] Failed to fetch user profile:', profileError);
      return NextResponse.json({ error: 'Failed to verify account status' }, { status: 500 });
    }

    const isPremium = profile.subscription_tier === 'premium' || profile.is_premium || false;

    if (!isPremium) {
      console.log('🎬 [VIDEO-UPLOAD] Upload rejected - user is not premium:', user.id);
      return NextResponse.json(
        {
          error: 'Upload requires premium',
          details:
            'Free users can record videos using the camera. Upgrade to premium to upload pre-edited videos!',
          upgrade: true,
        },
        { status: 403 }
      );
    }

    console.log('🎬 [VIDEO-UPLOAD] Uploading video:', {
      fileName: videoFile.name,
      fileSize: videoFile.size,
      fileType: videoFile.type,
      vibelogId,
      userId: user.id,
    });

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
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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

    // Upload to Supabase Storage
    const supabaseAdmin = await createServerAdminClient();
    const { error: uploadError } = await supabaseAdmin.storage
      .from(VIBELOGS_BUCKET)
      .upload(path, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error('❌ [VIDEO-UPLOAD] Storage upload failed:', uploadError);
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
        video_source: 'uploaded',
        video_uploaded_at: new Date().toISOString(),
        video_generation_status: 'completed', // Mark as complete (user-uploaded)
      })
      .eq('id', vibelogId);

    if (updateError) {
      console.error('❌ [VIDEO-UPLOAD] Database update failed:', updateError);
      // Try to clean up the uploaded file
      await supabaseAdmin.storage.from(VIBELOGS_BUCKET).remove([path]);
      throw updateError;
    }

    console.log('✅ [VIDEO-UPLOAD] Upload successful:', {
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
    console.error('❌ [VIDEO-UPLOAD] Upload failed:', error);

    // If we have vibelogId, mark video upload as failed
    if (vibelogId) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        await supabase
          .from('vibelogs')
          .update({
            video_generation_status: 'failed',
            video_generation_error: error instanceof Error ? error.message : 'Video upload failed',
          })
          .eq('id', vibelogId);
      } catch (updateError) {
        console.error('❌ [VIDEO-UPLOAD] Failed to update error status:', updateError);
      }
    }

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
