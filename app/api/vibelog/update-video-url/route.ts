/**
 * Update Video URL API Route
 * POST /api/vibelog/update-video-url
 * Updates vibelog with video URL after client-side upload to Supabase Storage
 * Lightweight endpoint that only updates database (video is already in storage)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createServerSupabaseClient } from '@/lib/supabase';
import { createServerAdminClient } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const maxDuration = 10; // Only updating database, very fast

// Validation schema
const UpdateVideoUrlSchema = z.object({
  vibelogId: z.string().uuid(),
  videoUrl: z.string().url(),
  videoSource: z.enum(['captured', 'uploaded']).optional().default('captured'),
  captureMode: z.enum(['audio', 'camera', 'screen', 'screen-with-camera']).optional(),
  hasCameraPip: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Parse JSON body (lightweight, no file upload)
    const body = await request.json();

    // Validate inputs
    const validated = UpdateVideoUrlSchema.parse(body);
    const { vibelogId, videoUrl, videoSource, captureMode, hasCameraPip } = validated;

    // SECURITY: Get user from session, NEVER trust client-supplied userId
    const supabaseClient = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    console.log('🔗 [UPDATE-VIDEO-URL] Updating vibelog:', {
      vibelogId,
      videoUrl,
      userId: user.id,
      source: videoSource,
      captureMode,
      hasCameraPip,
    });

    // Verify vibelog ownership
    const supabaseAdmin = await createServerAdminClient();
    const { data: vibelog, error: fetchError } = await supabaseAdmin
      .from('vibelogs')
      .select('id, user_id, title')
      .eq('id', vibelogId)
      .single();

    if (fetchError || !vibelog) {
      return NextResponse.json({ error: 'Vibelog not found' }, { status: 404 });
    }

    if (vibelog.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to update this vibelog' },
        { status: 403 }
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      video_url: videoUrl,
      video_source: videoSource, // 'captured' = camera recording, 'uploaded' = file upload
      video_uploaded_at: new Date().toISOString(),
    };

    // Add screen-share specific fields if provided
    if (captureMode) {
      updateData.capture_mode = captureMode;
    }
    if (hasCameraPip !== undefined) {
      updateData.has_camera_pip = hasCameraPip;
    }

    // Update vibelog with video URL and metadata
    const { error: updateError } = await supabaseAdmin
      .from('vibelogs')
      .update(updateData)
      .eq('id', vibelogId);

    if (updateError) {
      console.error('❌ [UPDATE-VIDEO-URL] Database update failed:', updateError);
      throw updateError;
    }

    console.log('✅ [UPDATE-VIDEO-URL] Update successful');

    return NextResponse.json({
      success: true,
      vibelogId,
      videoUrl,
    });
  } catch (error: unknown) {
    console.error('❌ [UPDATE-VIDEO-URL] Update failed:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to update video URL';
    return NextResponse.json(
      {
        error: 'Failed to update video URL',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
