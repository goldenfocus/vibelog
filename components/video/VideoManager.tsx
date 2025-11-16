'use client';

/**
 * Video Manager Component
 * 3-mode video system: Capture (free) | Upload (premium) | AI Generate (premium)
 * Pivot: Camera capture is default/free, upload and AI are premium features
 */

import { Camera, Sparkles, Upload, Crown } from 'lucide-react';
import React, { useState } from 'react';

import { useProfile } from '@/hooks/useProfile';

import { VideoCaptureZone } from './VideoCaptureZone';
import { VideoGenerator } from './VideoGenerator';
import { VideoUploadZone } from './VideoUploadZone';

interface VideoManagerProps {
  vibelogId: string;
  onVideoAdded?: (videoUrl: string) => void;
  showAllOptions?: boolean; // Show all 3 modes (default: true)
}

export function VideoManager({
  vibelogId,
  onVideoAdded,
  showAllOptions = true,
}: VideoManagerProps) {
  const [mode, setMode] = useState<'capture' | 'upload' | 'generate'>('capture'); // Default to capture
  const { profile } = useProfile();

  const isPremium = profile?.subscription_tier === 'premium' || profile?.is_premium || false;

  return (
    <div className="space-y-4">
      {/* 3-Mode Toggle */}
      {showAllOptions && (
        <div className="flex gap-2">
          {/* Capture (Free - Default) */}
          <button
            onClick={() => setMode('capture')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
              mode === 'capture'
                ? 'border-purple-600 bg-purple-50 text-purple-900 dark:border-purple-400 dark:bg-purple-900/20 dark:text-purple-100'
                : 'border-border/50 bg-card text-muted-foreground hover:border-border hover:bg-muted/50'
            }`}
          >
            <Camera className="h-4 w-4" />
            <span className="hidden sm:inline">Record</span>
          </button>

          {/* Upload (Premium) */}
          <button
            onClick={() => {
              if (!isPremium) {
                // TODO: Replace with proper upgrade modal
                // eslint-disable-next-line no-alert
                alert('Upload requires premium. Upgrade to upload pre-edited videos!');
                return;
              }
              setMode('upload');
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
              mode === 'upload'
                ? 'border-purple-600 bg-purple-50 text-purple-900 dark:border-purple-400 dark:bg-purple-900/20 dark:text-purple-100'
                : 'border-border/50 bg-card text-muted-foreground hover:border-border hover:bg-muted/50'
            }`}
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Upload</span>
            {!isPremium && <Crown className="h-3 w-3 text-yellow-500" />}
          </button>

          {/* AI Generate (Premium Beta) */}
          <button
            onClick={() => {
              if (!isPremium) {
                // TODO: Replace with proper upgrade modal
                // eslint-disable-next-line no-alert
                alert('AI generation requires premium. Upgrade for AI-powered videos!');
                return;
              }
              setMode('generate');
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
              mode === 'generate'
                ? 'border-purple-600 bg-purple-50 text-purple-900 dark:border-purple-400 dark:bg-purple-900/20 dark:text-purple-100'
                : 'border-border/50 bg-card text-muted-foreground hover:border-border hover:bg-muted/50'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">AI</span>
            {!isPremium && <Crown className="h-3 w-3 text-yellow-500" />}
          </button>
        </div>
      )}

      {/* Content based on mode */}
      {mode === 'capture' && (
        <VideoCaptureZone
          vibelogId={vibelogId}
          onVideoCaptured={onVideoAdded}
          isPremium={isPremium}
        />
      )}

      {mode === 'upload' && (
        <>
          {!isPremium ? (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
              <div className="flex items-start gap-3">
                <Crown className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
                <div>
                  <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                    Premium Feature
                  </p>
                  <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-300">
                    Upload requires premium. Upgrade to upload pre-edited videos! Free users can
                    record directly using the camera.
                  </p>
                  <button className="mt-2 text-xs text-yellow-600 hover:underline dark:text-yellow-400">
                    Upgrade to Premium
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <VideoUploadZone vibelogId={vibelogId} onVideoUploaded={onVideoAdded} />
          )}
        </>
      )}

      {mode === 'generate' && (
        <>
          {!isPremium ? (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
              <div className="flex items-start gap-3">
                <Crown className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
                <div>
                  <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                    Premium Feature
                  </p>
                  <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-300">
                    AI video generation requires premium. Upgrade for AI-powered video creation!
                    Free users can record directly using the camera.
                  </p>
                  <button className="mt-2 text-xs text-yellow-600 hover:underline dark:text-yellow-400">
                    Upgrade to Premium
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* AI Generation Info */}
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
                <p className="text-xs text-yellow-900 dark:text-yellow-100">
                  <strong>AI Video Generation (Beta):</strong> Takes 3-8 minutes and costs $0.50 per
                  video. For best results, record or upload your own video instead.
                </p>
              </div>

              <VideoGenerator vibelogId={vibelogId} onVideoGenerated={onVideoAdded} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
