'use client';

/**
 * Video Generator Component
 * UI for triggering video generation and displaying status
 */

import React, { useState } from 'react';
import { Loader2, Video, AlertCircle } from 'lucide-react';

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

      const response = await fetch('/api/video/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vibelogId,
          aspectRatio: '16:9',
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate video');
      }

      setVideoUrl(data.data.videoUrl);
      setStatus('completed');

      if (onVideoGenerated) {
        onVideoGenerated(data.data.videoUrl);
      }
    } catch (err: any) {
      console.error('Video generation error:', err);
      setError(err.message || 'Failed to generate video');
      setStatus('failed');
    }
  };

  if (status === 'generating') {
    return (
      <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
        <div>
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Generating video...
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            This may take 1-2 minutes. Please wait.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-900 dark:text-red-100">
            Video generation failed
          </p>
          <p className="text-xs text-red-700 dark:text-red-300 mt-1">
            {error}
          </p>
          <button
            onClick={handleGenerateVideo}
            className="mt-2 text-xs text-red-600 dark:text-red-400 hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (status === 'completed' && videoUrl) {
    return (
      <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
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
      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg"
    >
      <Video className="h-4 w-4" />
      <span className="text-sm font-medium">Generate AI Video</span>
    </button>
  );
}
