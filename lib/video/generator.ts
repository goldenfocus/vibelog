/**
 * Video Generation with fal.ai
 * Integrates MiniMax Video-01 for AI video generation
 */

import type { VideoGenerationRequest, VideoGenerationResponse } from './types';

const FAL_API_KEY = process.env.FAL_API_KEY;
const FAL_API_URL = 'https://fal.run/fal-ai/minimax/video-01';

if (!FAL_API_KEY) {
  console.warn('FAL_API_KEY not configured. Video generation will not work.');
}

/**
 * Generate video using fal.ai MiniMax Video-01
 * Uses synchronous endpoint - will wait for completion (takes ~1-2 minutes)
 */
export async function generateVideo(
  request: VideoGenerationRequest
): Promise<VideoGenerationResponse> {
  if (!FAL_API_KEY) {
    throw new Error('FAL_API_KEY is not configured');
  }

  try {
    console.log('[Video Generator] Generating video with fal.ai MiniMax:', {
      prompt: request.prompt.substring(0, 100),
      hasImage: !!request.imageUrl,
    });

    // Prepare the request payload for MiniMax Video-01
    const payload: Record<string, unknown> = {
      prompt: request.prompt,
      prompt_optimizer: true, // Enable prompt optimization
    };

    // Note: MiniMax Video-01 text-to-video doesn't support image_url
    // For image-to-video, use fal-ai/minimax/video-01/image-to-video instead

    // Call fal.ai synchronous endpoint (blocking until complete)
    const response = await fetch(FAL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Video Generator] fal.ai error:', errorText);
      throw new Error(`fal.ai failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();

    console.log('[Video Generator] Video generation completed:', {
      videoUrl: result.video?.url,
    });

    if (!result.video || !result.video.url) {
      throw new Error('fal.ai returned invalid response - no video URL');
    }

    return {
      videoUrl: result.video.url,
      duration: 6, // MiniMax typically generates 6-second videos
      width: 1280,
      height: 720,
    };
  } catch (error) {
    console.error('[Video Generator] Error:', error);
    throw error;
  }
}

/**
 * Estimate video generation cost
 * fal.ai pricing for MiniMax: ~$0.05 per video
 */
export function estimateVideoCost(durationSeconds: number): number {
  return 0.05; // Flat rate per video for MiniMax
}
