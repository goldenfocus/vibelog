/**
 * Video Generation Status API Route
 * GET /api/video/status/:vibelogId
 * Check status of async video generation job
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkVideoGenerationStatus } from '@/lib/video/generator';
import { uploadVideoToStorage } from '@/lib/video/storage';

export async function GET(
  _request: NextRequest,
  { params }: { params: { vibelogId: string } }
) {
  try {
    const { vibelogId } = params;

    console.log('[Video Status API] Checking status for vibelog:', vibelogId);

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch vibelog with video status
    const { data: vibelog, error: fetchError } = await supabase
      .from('vibelogs')
      .select(
        'id, video_request_id, video_generation_status, video_url, video_generation_error'
      )
      .eq('id', vibelogId)
      .single();

    if (fetchError || !vibelog) {
      return NextResponse.json(
        { success: false, error: 'Vibelog not found' },
        { status: 404 }
      );
    }

    // If already completed or failed, return current status
    if (vibelog.video_generation_status === 'completed') {
      return NextResponse.json({
        success: true,
        status: 'completed',
        videoUrl: vibelog.video_url,
      });
    }

    if (vibelog.video_generation_status === 'failed') {
      return NextResponse.json({
        success: false,
        status: 'failed',
        error: vibelog.video_generation_error || 'Video generation failed',
      });
    }

    // If no request ID, return current status
    if (!vibelog.video_request_id) {
      return NextResponse.json({
        success: true,
        status: vibelog.video_generation_status || 'unknown',
      });
    }

    // Check status with fal.ai
    console.log('[Video Status API] Checking fal.ai status...');
    const falStatus = await checkVideoGenerationStatus(vibelog.video_request_id);

    // If status changed, update database
    if (falStatus.status === 'completed' && falStatus.videoUrl) {
      console.log('[Video Status API] Video completed! Uploading to storage...');

      // Upload video to Supabase Storage
      const storedVideoUrl = await uploadVideoToStorage(falStatus.videoUrl, vibelogId);

      // Update database with completed video
      await supabase
        .from('vibelogs')
        .update({
          video_url: storedVideoUrl,
          video_duration: 6, // MiniMax default
          video_width: 1280,
          video_height: 720,
          video_generation_status: 'completed',
          video_generated_at: new Date().toISOString(),
        })
        .eq('id', vibelogId);

      console.log('[Video Status API] Video stored successfully');

      return NextResponse.json({
        success: true,
        status: 'completed',
        videoUrl: storedVideoUrl,
      });
    } else if (falStatus.status === 'failed') {
      console.error('[Video Status API] Video generation failed:', falStatus.error);

      // Update database with failure
      await supabase
        .from('vibelogs')
        .update({
          video_generation_status: 'failed',
          video_generation_error: falStatus.error || 'Unknown error',
        })
        .eq('id', vibelogId);

      return NextResponse.json({
        success: false,
        status: 'failed',
        error: falStatus.error,
      });
    } else {
      // Still processing - update status if changed
      if (falStatus.status !== vibelog.video_generation_status) {
        await supabase
          .from('vibelogs')
          .update({ video_generation_status: falStatus.status })
          .eq('id', vibelogId);
      }

      return NextResponse.json({
        success: true,
        status: falStatus.status,
        message:
          falStatus.status === 'generating'
            ? 'Video is being generated...'
            : 'Video is queued for generation...',
      });
    }
  } catch (error: unknown) {
    console.error('[Video Status API] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to check video status';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
