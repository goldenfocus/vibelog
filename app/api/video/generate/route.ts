/**
 * Video Generation API Route
 * POST /api/video/generate
 * Generate AI video for a vibelog using fal.ai
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { generateVideo } from '@/lib/video/generator';
import { uploadVideoToStorage } from '@/lib/video/storage';

// Validation schema
const GenerateVideoSchema = z.object({
  vibelogId: z.string().uuid(),
  prompt: z.string().min(10).max(1000).optional(),
  imageUrl: z.string().url().optional(),
  aspectRatio: z.enum(['16:9', '9:16']).optional(),
});

export async function POST(request: NextRequest) {
  let vibelogId: string | undefined;

  try {
    // Parse and validate request body
    const body = await request.json();
    const validated = GenerateVideoSchema.parse(body);
    vibelogId = validated.vibelogId;
    const { prompt, imageUrl, aspectRatio } = validated;

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
      return NextResponse.json(
        { success: false, error: 'Vibelog not found' },
        { status: 404 }
      );
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
      .update({ video_generation_status: 'generating', video_generation_error: null })
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
          video_generation_error: 'No content available for video generation. Vibelog must have content or teaser.',
        })
        .eq('id', vibelogId);

      return NextResponse.json(
        { success: false, error: 'No content available for video generation. Vibelog must have content or teaser.' },
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

    console.log('[Video API] Generating video with fal.ai...', {
      promptLength: videoPrompt.length,
      hasImage: !!videoImageUrl,
    });

    // Generate video with fal.ai
    const videoResult = await generateVideo({
      prompt: videoPrompt,
      imageUrl: videoImageUrl,
      aspectRatio: aspectRatio || '16:9',
    });

    console.log('[Video API] Video generated, uploading to storage...');

    // Upload video to Supabase Storage
    const storedVideoUrl = await uploadVideoToStorage(videoResult.videoUrl, vibelogId);

    console.log('[Video API] Video uploaded, updating database...');

    // Update vibelog with video data
    const { error: updateError } = await supabase
      .from('vibelogs')
      .update({
        video_url: storedVideoUrl,
        video_duration: videoResult.duration,
        video_width: videoResult.width,
        video_height: videoResult.height,
        video_generation_status: 'completed',
        video_generated_at: new Date().toISOString(),
      })
      .eq('id', vibelogId);

    if (updateError) {
      console.error('[Video API] Database update error:', updateError);
      throw new Error(`Failed to update vibelog: ${updateError.message}`);
    }

    console.log('[Video API] Video generation completed successfully');

    return NextResponse.json({
      success: true,
      data: {
        videoUrl: storedVideoUrl,
        duration: videoResult.duration,
        width: videoResult.width,
        height: videoResult.height,
      },
    });
  } catch (error: unknown) {
    console.error('[Video API] Error:', error);

    // CRITICAL: Always update status to failed if we have vibelogId
    // This prevents the status from being stuck in 'generating'
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
          console.error('[Video API] CRITICAL: Failed to update status to failed:', failedUpdateError);
        } else {
          console.log('[Video API] Status updated to failed for vibelog:', vibelogId);
        }
      } catch (updateError) {
        console.error('[Video API] CRITICAL: Exception while updating status to failed:', updateError);
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
