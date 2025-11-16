/**
 * Video Generation with fal.ai
 * Integrates MiniMax Video-01 for AI video generation
 * Uses ASYNC API to avoid serverless function timeouts
 */

import type { VideoGenerationRequest, VideoGenerationResponse } from './types';

const FAL_API_KEY = process.env.FAL_API_KEY;
const FAL_QUEUE_SUBMIT_URL = 'https://queue.fal.run/fal-ai/minimax/video-01';
const FAL_QUEUE_STATUS_BASE = 'https://queue.fal.run/fal-ai/minimax/video-01/requests';

if (!FAL_API_KEY) {
  console.warn('FAL_API_KEY not configured. Video generation will not work.');
}

interface FalQueueSubmitResponse {
  request_id: string;
  status_url: string;
}

interface FalQueueStatusResponse {
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  response_url?: string;
  error?: string;
}

/**
 * Submit video generation job to fal.ai queue (ASYNC - returns immediately)
 * Returns request_id for tracking the job
 */
export async function submitVideoGeneration(
  request: VideoGenerationRequest
): Promise<{ requestId: string }> {
  if (!FAL_API_KEY) {
    throw new Error('FAL_API_KEY is not configured');
  }

  try {
    console.log('[Video Generator] Submitting async video job to fal.ai:', {
      prompt: request.prompt.substring(0, 100),
      hasImage: !!request.imageUrl,
    });

    // Prepare the request payload for MiniMax Video-01
    const payload: Record<string, unknown> = {
      prompt: request.prompt,
      prompt_optimizer: true, // Enable prompt optimization
    };

    const response = await fetch(FAL_QUEUE_SUBMIT_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Video Generator] fal.ai submit error:', errorText);
      throw new Error(`fal.ai submit failed: ${response.status} ${errorText}`);
    }

    const result = (await response.json()) as FalQueueSubmitResponse;

    console.log('[Video Generator] Job submitted successfully:', {
      requestId: result.request_id,
    });

    return {
      requestId: result.request_id,
    };
  } catch (error) {
    console.error('[Video Generator] Submit error:', error);
    throw error;
  }
}

/**
 * Check status of async video generation job
 * Returns the current status and video URL if completed
 */
export async function checkVideoGenerationStatus(
  requestId: string
): Promise<{
  status: 'queued' | 'generating' | 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
}> {
  if (!FAL_API_KEY) {
    throw new Error('FAL_API_KEY is not configured');
  }

  try {
    console.log('[Video Generator] Checking status for request:', requestId);

    // NOTE: fal.ai returns a status_url on submit. The documented pattern is
    // GET /requests/{id} (no /status suffix). The previous code used
    // /requests/{id}/status which returns 405. Use the base path so polling works.
    const statusUrl = `${FAL_QUEUE_STATUS_BASE}/${requestId}`;
    const response = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Video Generator] Status check error:', errorText);
      throw new Error(`Status check failed: ${response.status} ${errorText}`);
    }

    const result = (await response.json()) as FalQueueStatusResponse;

    console.log('[Video Generator] Status:', result.status);

    // Map fal.ai status to our status
    if (result.status === 'COMPLETED' && result.response_url) {
      // Fetch the actual result
      const resultResponse = await fetch(result.response_url, {
        headers: {
          'Authorization': `Key ${FAL_API_KEY}`,
        },
      });

      if (!resultResponse.ok) {
        throw new Error('Failed to fetch completed video result');
      }

      const videoResult = await resultResponse.json();

      if (!videoResult.video || !videoResult.video.url) {
        throw new Error('Completed result missing video URL');
      }

      return {
        status: 'completed',
        videoUrl: videoResult.video.url,
      };
    } else if (result.status === 'FAILED') {
      return {
        status: 'failed',
        error: result.error || 'Video generation failed',
      };
    } else if (result.status === 'IN_PROGRESS') {
      return {
        status: 'generating',
      };
    } else {
      return {
        status: 'queued',
      };
    }
  } catch (error) {
    console.error('[Video Generator] Status check error:', error);
    throw error;
  }
}

/**
 * DEPRECATED: Old synchronous method - kept for backward compatibility
 * Use submitVideoGeneration() instead
 */
export async function generateVideo(
  request: VideoGenerationRequest
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
