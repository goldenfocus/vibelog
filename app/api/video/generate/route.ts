/**
 * Video Generation API Route
 * POST /api/video/generate
 * Generate AI video for a vibelog using fal.ai (SYNCHRONOUS - Fixed)
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { generateVideoSync } from '@/lib/video/generator';
import { uploadVideoToStorage } from '@/lib/video/storage';

// Validation schema
const GenerateVideoSchema = z.object({
  vibelogId: z.string().uuid(),
  prompt: z.string().min(10).max(1000).optional(),
  imageUrl: z.string().url().optional(),
  aspectRatio: z.enum(['16:9', '9:16']).optional(),
});

export const maxDuration = 300; // 5 minutes for video generation

export async function POST(request: NextRequest) {
  let vibelogId: string | undefined;

  try {
    // Parse and validate request body
    const body = await request.json();
    const validated = GenerateVideoSchema.parse(body);
    vibelogId = validated.vibelogId;
    const { prompt, imageUrl } = validated;

    console.log('[Video API] Generate video request:', {
      vibelogId,
      hasPrompt: !!prompt,
      hasImage: !!imageUrl,
    });

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch vibelog data
    const { data: vibelog, error: fetchError } = await supabase
      .from('vibelogs')
      .select('id, title, teaser, content, cover_image_url, video_generation_status')
      .eq('id', vibelogId)
      .single();

    if (fetchError || !vibelog) {
      return NextResponse.json({ success: false, error: 'Vibelog not found' }, { status: 404 });
    }

    // Check if video is already being generated
    if (vibelog.video_generation_status === 'generating') {
      return NextResponse.json(
        { success: false, error: 'Video is already being generated' },
        { status: 409 }
      );
    }

    // Update status to generating
    await supabase
      .from('vibelogs')
      .update({
        video_generation_status: 'generating',
        video_generation_error: null,
        video_requested_at: new Date().toISOString(),
      })
      .eq('id', vibelogId);

    // Prepare video generation request
    let videoPrompt = prompt || vibelog.content || vibelog.teaser;
    const videoImageUrl = imageUrl || vibelog.cover_image_url || undefined;

    // Validate we have a prompt
    if (!videoPrompt || videoPrompt.trim().length < 10) {
      console.error('[Video API] No valid prompt available for video generation');
      await supabase
        .from('vibelogs')
        .update({
          video_generation_status: 'failed',
          video_generation_error:
            'No content available for video generation. Vibelog must have content or teaser.',
        })
        .eq('id', vibelogId);

      return NextResponse.json(
        {
          success: false,
          error: 'No content available for video generation. Vibelog must have content or teaser.',
        },
        { status: 400 }
      );
    }

    // Truncate prompt to 2000 chars (fal.ai limit)
    // Prefer teaser if available and content is too long
    if (videoPrompt.length > 2000) {
      console.log('[Video API] Prompt too long, trying teaser...');
      if (vibelog.teaser && vibelog.teaser.length <= 2000) {
        videoPrompt = vibelog.teaser;
        console.log('[Video API] Using teaser instead of content');
      } else {
        // Truncate to 2000 chars with ellipsis
        videoPrompt = videoPrompt.substring(0, 1997) + '...';
        console.log('[Video API] Truncated prompt to 2000 chars');
      }
    }

    console.log('[Video API] Starting SYNCHRONOUS video generation...', {
      promptLength: videoPrompt.length,
      hasImage: !!videoImageUrl,
    });

    // Generate video synchronously (waits for completion)
    const { videoUrl: falVideoUrl, duration } = await generateVideoSync({
      prompt: videoPrompt,
      imageUrl: videoImageUrl,
      aspectRatio: '16:9',
    });

    console.log('[Video API] Video generated! Uploading to storage...', { falVideoUrl });

    // Upload video to Supabase Storage
    const storedVideoUrl = await uploadVideoToStorage(falVideoUrl, vibelogId);

    console.log('[Video API] Video stored successfully:', storedVideoUrl);

    // Update database with completed video
    await supabase
      .from('vibelogs')
      .update({
        video_url: storedVideoUrl,
        video_duration: duration,
        video_width: 1280,
        video_height: 720,
        video_generation_status: 'completed',
        video_generated_at: new Date().toISOString(),
        video_request_id: null, // Clear old request ID
      })
      .eq('id', vibelogId);

    console.log('[Video API] Video generation completed successfully');

    // Return success with video URL
    return NextResponse.json(
      {
        success: true,
        message: 'Video generated successfully',
        data: {
          vibelogId,
          videoUrl: storedVideoUrl,
          status: 'completed',
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('[Video API] Error:', error);

    // CRITICAL: Always update status to failed if we have vibelogId
    if (vibelogId) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const { error: failedUpdateError } = await supabase
          .from('vibelogs')
          .update({
            video_generation_status: 'failed',
            video_generation_error: errorMessage,
          })
          .eq('id', vibelogId);

        if (failedUpdateError) {
          console.error(
            '[Video API] CRITICAL: Failed to update status to failed:',
            failedUpdateError
          );
        } else {
          console.log('[Video API] Status updated to failed for vibelog:', vibelogId);
        }
      } catch (updateError) {
        console.error(
          '[Video API] CRITICAL: Exception while updating status to failed:',
          updateError
        );
      }
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to generate video';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
