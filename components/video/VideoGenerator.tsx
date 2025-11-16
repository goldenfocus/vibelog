'use client';

/**
 * Video Generator Component
 * UI for triggering video generation and displaying status
 * ASYNC VERSION - Polls for status instead of waiting
 */

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Video, AlertCircle } from 'lucide-react';

interface VideoGeneratorProps {
  vibelogId: string;
  onVideoGenerated?: (videoUrl: string) => void;
}

export function VideoGenerator({ vibelogId, onVideoGenerated }: VideoGeneratorProps) {
  const [status, setStatus] = useState<'idle' | 'generating' | 'completed' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [pollingMessage, setPollingMessage] = useState('Submitting job...');
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Poll for video status
  const pollVideoStatus = async () => {
    try {
      console.log('[VideoGenerator] Polling video status...');

      const response = await fetch(`/api/video/status/${vibelogId}`);
      const data = await response.json();

      console.log('[VideoGenerator] Status poll response:', data);

      if (data.status === 'completed' && data.videoUrl) {
        console.log('[VideoGenerator] Video completed!', data.videoUrl);
        setStatus('completed');
        setVideoUrl(data.videoUrl);

        // Stop polling
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }

        if (onVideoGenerated) {
          onVideoGenerated(data.videoUrl);
        }

        // Reload page to show the video
        setTimeout(() => window.location.reload(), 500);
      } else if (data.status === 'failed') {
        console.error('[VideoGenerator] Video generation failed:', data.error);
        setStatus('failed');
        setError(data.error || 'Video generation failed');

        // Stop polling
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      } else {
        // Update message based on status
        if (data.status === 'queued') {
          setPollingMessage('Video queued for generation...');
        } else if (data.status === 'generating') {
          setPollingMessage('AI is generating your video...');
        }
      }
    } catch (err: unknown) {
      console.error('[VideoGenerator] Status poll error:', err);
      // Don't stop polling on network errors, might be transient
    }
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const handleGenerateVideo = async () => {
    try {
      setStatus('generating');
      setError(null);
      setPollingMessage('Submitting video generation job...');

      console.log('[VideoGenerator] Starting async video generation for vibelog:', vibelogId);

      // Submit the job (returns immediately with 202 Accepted)
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

      console.log('[VideoGenerator] Response status:', response.status);

      if (!response.ok && response.status !== 202) {
        const errorText = await response.text();
        console.error('[VideoGenerator] API error response:', errorText);
        throw new Error(`Server error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('[VideoGenerator] Response data:', data);

      if (!data.success) {
        throw new Error(data.error || 'Failed to start video generation');
      }

      console.log('[VideoGenerator] Job submitted successfully, starting polling...');
      setPollingMessage('Video generation started...');

      // Start polling every 10 seconds
      pollingIntervalRef.current = setInterval(pollVideoStatus, 10000);

      // Also poll immediately
      pollVideoStatus();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate video';
      console.error('[VideoGenerator] Video generation error:', errorMessage, err);
      setError(errorMessage);
      setStatus('failed');
    }
  };

  if (status === 'generating') {
    return (
      <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
        <div>
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            {pollingMessage}
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            This may take 2-5 minutes. You can navigate away and come back later.
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
