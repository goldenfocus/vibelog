/**
 * Video Generation with fal.ai
 * Integrates MiniMax Video-01 for AI video generation
 * PROPER ASYNC: Submit to queue, then poll in separate endpoint
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
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED';
  response_url?: string;
  error?: string;
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
 * Submit video generation to async queue (returns immediately)
 */
export async function generateVideoSync(
  request: VideoGenerationRequest
): Promise<{ videoUrl: string; duration: number }> {
  if (!FAL_API_KEY) {
    throw new Error('FAL_API_KEY is not configured');
  }

  try {
    console.log('[Video Generator] Submitting to async queue:', {
      prompt: request.prompt.substring(0, 100),
      hasImage: !!request.imageUrl,
    });

    const payload = {
      prompt: request.prompt,
      prompt_optimizer: true,
    };

    // Submit to queue
    const submitResponse = await fetch(FAL_QUEUE_SUBMIT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Key ${FAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error('[Video Generator] Queue submission error:', errorText);
      throw new Error(`Queue submission failed: ${submitResponse.status} ${errorText}`);
    }

    const submitResult = (await submitResponse.json()) as FalQueueSubmitResponse;
    console.log('[Video Generator] Submitted to queue:', submitResult.request_id);

    // Poll for completion (server-side only, with proper timeout)
    const maxAttempts = 60; // 5 minutes max (5 second intervals)
    const pollInterval = 5000; // 5 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      const statusUrl = `${FAL_QUEUE_STATUS_BASE}/${submitResult.request_id}/status`;
      const statusResponse = await fetch(statusUrl, {
        method: 'GET',
        headers: {
          Authorization: `Key ${FAL_API_KEY}`,
        },
      });

      if (!statusResponse.ok) {
        console.warn('[Video Generator] Status poll failed, retrying...');
        continue;
      }

      const statusResult = (await statusResponse.json()) as FalQueueStatusResponse;
      console.log('[Video Generator] Status:', statusResult.status);

      if (statusResult.status === 'COMPLETED' && statusResult.response_url) {
        // Fetch final result
        const resultResponse = await fetch(statusResult.response_url, {
          headers: {
            Authorization: `Key ${FAL_API_KEY}`,
          },
        });

        if (!resultResponse.ok) {
          throw new Error('Failed to fetch completed video');
        }

        const videoResult = (await resultResponse.json()) as FalVideoResult;

        if (!videoResult.video || !videoResult.video.url) {
          throw new Error('Completed result missing video URL');
        }

        console.log('[Video Generator] Video generated successfully');

        return {
          videoUrl: videoResult.video.url,
          duration: 6,
        };
      }
    }

    throw new Error('Video generation timed out after 5 minutes');
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
