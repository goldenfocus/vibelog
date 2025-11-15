/**
 * Video Generation with fal.ai
 * Integrates Google Veo 3.1 for AI video generation
 */

import type { VideoGenerationRequest, VideoGenerationResponse } from './types';

const FAL_API_KEY = process.env.FAL_API_KEY;
const FAL_API_URL = 'https://queue.fal.run/fal-ai/minimax-video/text-to-video';

if (!FAL_API_KEY) {
  console.warn('FAL_API_KEY not configured. Video generation will not work.');
}

/**
 * Generate video using fal.ai text-to-video or image-to-video
 */
export async function generateVideo(
  request: VideoGenerationRequest
): Promise<VideoGenerationResponse> {
  if (!FAL_API_KEY) {
    throw new Error('FAL_API_KEY is not configured');
  }

  try {
    // Prepare the request payload
    const payload: any = {
      prompt: request.prompt,
    };

    // Add optional parameters
    if (request.imageUrl) {
      payload.image_url = request.imageUrl;
    }

    if (request.aspectRatio) {
      payload.aspect_ratio = request.aspectRatio;
    }

    console.log('[Video Generator] Generating video with fal.ai:', {
      prompt: request.prompt.substring(0, 100),
      hasImage: !!request.imageUrl,
      aspectRatio: request.aspectRatio,
    });

    // Submit to fal.ai queue
    const queueResponse = await fetch(FAL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: payload,
      }),
    });

    if (!queueResponse.ok) {
      const errorText = await queueResponse.text();
      console.error('[Video Generator] fal.ai queue error:', errorText);
      throw new Error(`fal.ai queue failed: ${queueResponse.status} ${errorText}`);
    }

    const queueData = await queueResponse.json();
    const requestId = queueData.request_id;

    console.log('[Video Generator] Video queued, request ID:', requestId);

    // Poll for completion
    const result = await pollForCompletion(requestId);

    console.log('[Video Generator] Video generation completed:', {
      videoUrl: result.video.url,
      duration: result.video.duration,
    });

    return {
      videoUrl: result.video.url,
      duration: result.video.duration || 8,
      width: result.video.width || 1280,
      height: result.video.height || 720,
    };
  } catch (error) {
    console.error('[Video Generator] Error:', error);
    throw error;
  }
}

/**
 * Poll fal.ai queue for completion
 */
async function pollForCompletion(requestId: string, maxAttempts = 60): Promise<any> {
  const pollUrl = `https://queue.fal.run/fal-ai/minimax-video/text-to-video/requests/${requestId}`;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(pollUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to poll status: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'COMPLETED') {
      return data;
    }

    if (data.status === 'FAILED') {
      throw new Error(`Video generation failed: ${data.error || 'Unknown error'}`);
    }

    // Wait 2 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log(`[Video Generator] Polling attempt ${attempt + 1}/${maxAttempts}, status: ${data.status}`);
  }

  throw new Error('Video generation timeout - exceeded maximum polling attempts');
}

/**
 * Estimate video generation cost
 * fal.ai pricing: ~$0.10/second for Veo 3.1 Fast
 */
export function estimateVideoCost(durationSeconds: number): number {
  const pricePerSecond = 0.10; // USD
  return durationSeconds * pricePerSecond;
}
