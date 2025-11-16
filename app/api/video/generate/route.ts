/**
 * Video Generation API Route
 * POST /api/video/generate
 * Submits video generation job to fal.ai queue (ASYNC - returns immediately)
 * Client should poll /api/video/status/[vibelogId] for completion
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { submitVideoGenerationAsync } from '@/lib/video/generator';

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
    // OPTIMIZATION: Prioritize shorter prompts for faster fal.ai processing
    // 1. Use custom prompt if provided (already optimized by user)
    // 2. Prefer teaser (AI-generated hook, concise and engaging)
    // 3. Fall back to smart truncation of content
    let videoPrompt: string;

    if (prompt) {
      // Custom prompt provided - use as-is
      videoPrompt = prompt;
      console.log('[Video API] Using custom prompt:', videoPrompt.substring(0, 100));
    } else if (vibelog.teaser && vibelog.teaser.trim().length >= 10) {
      // Teaser exists and is valid - prefer it for speed
      videoPrompt = vibelog.teaser;
      console.log('[Video API] Using teaser for faster generation:', videoPrompt.substring(0, 100));
    } else if (vibelog.content) {
      // Extract smart excerpt: title + first 200 chars of content
      const title = vibelog.title || '';
      const contentWithoutTitle = vibelog.content
        .replace(new RegExp(`^#\\s+${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\n`, 'i'), '')
        .trim();

      const excerpt = contentWithoutTitle.substring(0, 200);
      videoPrompt = title ? `${title}\n\n${excerpt}` : excerpt;
      console.log(
        '[Video API] Using smart excerpt (title + 200 chars):',
        videoPrompt.substring(0, 100)
      );
    } else {
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

    const videoImageUrl = imageUrl || vibelog.cover_image_url || undefined;

    // Validate final prompt
    if (!videoPrompt || videoPrompt.trim().length < 10) {
      console.error('[Video API] Prompt too short after processing');
      await supabase
        .from('vibelogs')
        .update({
          video_generation_status: 'failed',
          video_generation_error: 'Generated prompt is too short for video generation.',
        })
        .eq('id', vibelogId);

      return NextResponse.json(
        {
          success: false,
          error: 'Generated prompt is too short for video generation.',
        },
        { status: 400 }
      );
    }

    // Final safety check: ensure prompt is within fal.ai limit (2000 chars)
    if (videoPrompt.length > 2000) {
      console.log('[Video API] Prompt exceeds 2000 chars, truncating...');
      videoPrompt = videoPrompt.substring(0, 1997) + '...';
    }

    console.log('[Video API] Submitting ASYNC video generation to fal.ai...', {
      promptLength: videoPrompt.length,
      hasImage: !!videoImageUrl,
    });

    // Submit video generation to fal.ai queue (returns immediately)
    const { requestId } = await submitVideoGenerationAsync({
      prompt: videoPrompt,
      imageUrl: videoImageUrl,
      aspectRatio: '16:9',
    });

    console.log('[Video API] Submitted to fal.ai queue:', requestId);

    // Update database with request_id and generating status
    await supabase
      .from('vibelogs')
      .update({
        video_request_id: requestId,
        video_generation_status: 'generating',
        video_requested_at: new Date().toISOString(),
      })
      .eq('id', vibelogId);

    console.log('[Video API] Video generation job submitted successfully');

    // Return success with request_id (client will poll /api/video/status)
    return NextResponse.json(
      {
        success: true,
        message: 'Video generation started. Poll /api/video/status for completion.',
        data: {
          vibelogId,
          requestId,
          status: 'generating',
        },
      },
      { status: 202 } // 202 Accepted - request accepted but not completed
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
