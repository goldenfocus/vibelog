'use client';

/**
 * Video Generator Component
 * UI for triggering video generation and displaying status
 * FIXED: Synchronous generation with real-time feedback
 */

import { Loader2, Video, AlertCircle } from 'lucide-react';
import React, { useState } from 'react';

interface VideoGeneratorProps {
  vibelogId: string;
  onVideoGenerated?: (videoUrl: string) => void;
}

export function VideoGenerator({ vibelogId, onVideoGenerated }: VideoGeneratorProps) {
  const [status, setStatus] = useState<'idle' | 'generating' | 'completed' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const handleGenerateVideo = async () => {
    try {
      setStatus('generating');
      setError(null);

      console.log('[VideoGenerator] Starting ASYNC video generation for vibelog:', vibelogId);

      // Step 1: Submit video generation job (returns immediately)
      const submitResponse = await fetch('/api/video/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vibelogId,
          aspectRatio: '16:9',
        }),
      });

      console.log('[VideoGenerator] Submit response status:', submitResponse.status);

      const submitData = await submitResponse.json();
      console.log('[VideoGenerator] Submit response data:', submitData);

      if (!submitResponse.ok || !submitData.success) {
        throw new Error(submitData.error || 'Failed to start video generation');
      }

      console.log('[VideoGenerator] Video generation started, polling for completion...');

      // Step 2: Poll /api/video/status until completed or failed
      const maxAttempts = 120; // 10 minutes max (5 second intervals)
      const pollInterval = 5000; // 5 seconds

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Wait before polling
        await new Promise(resolve => setTimeout(resolve, pollInterval));

        console.log(`[VideoGenerator] Polling attempt ${attempt + 1}/${maxAttempts}`);

        const statusResponse = await fetch(`/api/video/status/${vibelogId}`, {
          method: 'GET',
        });

        if (!statusResponse.ok) {
          console.error('[VideoGenerator] Status poll failed:', statusResponse.status);
          continue; // Retry
        }

        const statusData = await statusResponse.json();
        console.log('[VideoGenerator] Status data:', statusData);

        if (statusData.status === 'completed' && statusData.videoUrl) {
          console.log('[VideoGenerator] Video completed!', statusData.videoUrl);
          setStatus('completed');
          setVideoUrl(statusData.videoUrl);

          if (onVideoGenerated) {
            onVideoGenerated(statusData.videoUrl);
          }

          return; // Done!
        }

        if (statusData.status === 'failed') {
          throw new Error(statusData.error || 'Video generation failed');
        }

        // Still generating, continue polling
      }

      // If we get here, we timed out
      throw new Error('Video generation timed out after 10 minutes');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate video';
      console.error('[VideoGenerator] Video generation error:', errorMessage, err);
      setError(errorMessage);
      setStatus('failed');
    }
  };

  if (status === 'generating') {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
        <div>
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            AI is generating your video...
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            This takes 3-8 minutes. You can close this page - the video will appear when ready.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-900 dark:text-red-100">
            Video generation failed
          </p>
          <p className="mt-1 text-xs text-red-700 dark:text-red-300">{error}</p>
          <button
            onClick={handleGenerateVideo}
            className="mt-2 text-xs text-red-600 hover:underline dark:text-red-400"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (status === 'completed' && videoUrl) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
        <Video className="h-5 w-5 text-green-600 dark:text-green-400" />
        <div>
          <p className="text-sm font-medium text-green-900 dark:text-green-100">
            Video generated successfully!
          </p>
          <p className="text-xs text-green-700 dark:text-green-300">
            Your AI-generated video is ready.
          </p>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleGenerateVideo}
      className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-white shadow-md transition-all hover:from-purple-700 hover:to-pink-700 hover:shadow-lg"
    >
      <Video className="h-4 w-4" />
      <span className="text-sm font-medium">Generate AI Video</span>
    </button>
  );
}
