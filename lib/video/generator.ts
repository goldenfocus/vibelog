/**
 * Video Generation with fal.ai
 * Integrates MiniMax Video-01 for AI video generation
 * FIXED: Uses direct generation with real-time status updates
 */

import type { VideoGenerationRequest, VideoGenerationResponse } from './types';

const FAL_API_KEY = process.env.FAL_API_KEY;
const FAL_API_URL = 'https://fal.run/fal-ai/minimax/video-01';

if (!FAL_API_KEY) {
  console.warn('FAL_API_KEY not configured. Video generation will not work.');
}

interface FalVideoResult {
  video: {
    url: string;
    content_type: string;
    file_name: string;
    file_size: number;
    width: number;
    height: number;
  };
  timings: {
    inference: number;
  };
}

/**
 * Generate video synchronously with real-time progress
 * This replaces the broken async queue approach
 */
export async function generateVideoSync(
  request: VideoGenerationRequest
): Promise<{ videoUrl: string; duration: number }> {
  if (!FAL_API_KEY) {
    throw new Error('FAL_API_KEY is not configured');
  }

  try {
    console.log('[Video Generator] Starting SYNC video generation:', {
      prompt: request.prompt.substring(0, 100),
      hasImage: !!request.imageUrl,
    });

    const payload = {
      prompt: request.prompt,
      prompt_optimizer: true,
    };

    const response = await fetch(FAL_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Key ${FAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Video Generator] fal.ai error:', errorText);
      throw new Error(`Video generation failed: ${response.status} ${errorText}`);
    }

    const result = (await response.json()) as FalVideoResult;

    if (!result.video || !result.video.url) {
      throw new Error('Video generation completed but no video URL returned');
    }

    console.log('[Video Generator] Video generated successfully:', {
      url: result.video.url,
      size: result.video.file_size,
      inference_time: result.timings.inference,
    });

    return {
      videoUrl: result.video.url,
      duration: 6, // MiniMax default duration
    };
  } catch (error) {
    console.error('[Video Generator] Generation error:', error);
    throw error;
  }
}

/**
 * LEGACY: Submit video generation job to fal.ai queue (DEPRECATED)
 * Keeping for backward compatibility during migration
 */
export async function submitVideoGeneration(
  _request: VideoGenerationRequest
): Promise<{ requestId: string }> {
  console.warn(
    '[Video Generator] submitVideoGeneration is deprecated. Use generateVideoSync instead.'
  );

  // For now, throw an error to force migration to sync approach
  throw new Error(
    'Async queue generation is deprecated. System has been migrated to synchronous generation for reliability.'
  );
}

/**
 * LEGACY: Check status of async video generation job (DEPRECATED)
 */
export async function checkVideoGenerationStatus(_requestId: string): Promise<{
  status: 'queued' | 'generating' | 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
}> {
  console.warn('[Video Generator] checkVideoGenerationStatus is deprecated.');

  return {
    status: 'failed',
    error: 'Async queue generation is deprecated. Please regenerate video.',
  };
}

/**
 * DEPRECATED: Old synchronous method - kept for backward compatibility
 * Use submitVideoGeneration() instead
 */
export async function generateVideo(
  _request: VideoGenerationRequest
): Promise<VideoGenerationResponse> {
  throw new Error(
    'Synchronous generateVideo() is deprecated. Use submitVideoGeneration() + checkVideoGenerationStatus() instead.'
  );
}

/**
 * Estimate video generation cost
 * fal.ai pricing for MiniMax: ~$0.05 per video
 */
export function estimateVideoCost(_durationSeconds: number): number {
  return 0.05; // Flat rate per video for MiniMax
}
