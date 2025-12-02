/**
 * Video Preview and Recording Controls
 * Handles video preview state and recording controls
 */

'use client';

import { Camera, StopCircle, RotateCcw, X, RefreshCw, CheckCircle } from 'lucide-react';
import React, { forwardRef } from 'react';

// ============================================================================
// VIDEO PREVIEW STATE
// ============================================================================

interface VideoPreviewProps {
  videoBlob: Blob;
  recordingTime: number;
  formatTime: (seconds: number) => string;
  onRerecord: () => void;
  onConfirm: () => void;
}

export function VideoPreview({
  videoBlob,
  recordingTime,
  formatTime,
  onRerecord,
  onConfirm,
}: VideoPreviewProps) {
  const videoUrl = URL.createObjectURL(videoBlob);

  return (
    <div className="space-y-3 rounded-lg border-2 border-electric/30 bg-card p-4">
      {/* Video preview */}
      <video
        src={videoUrl}
        controls
        playsInline
        className="w-full rounded-lg bg-black"
        style={{ maxHeight: '400px' }}
      />

      {/* Video info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{(videoBlob.size / (1024 * 1024)).toFixed(1)} MB</span>
        <span>{formatTime(recordingTime)}</span>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onRerecord}
          className="flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Re-record</span>
        </button>
        <button
          onClick={onConfirm}
          className="flex items-center justify-center gap-2 rounded-lg bg-electric px-4 py-2.5 text-sm font-medium text-white hover:bg-electric/90"
        >
          <CheckCircle className="h-4 w-4" />
          <span>Use This Video</span>
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// RECORDING STATE
// ============================================================================

interface RecordingViewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  facingMode: 'user' | 'environment';
  recordingTime: number;
  maxDurationSeconds: number;
  isPremium: boolean;
  formatTime: (seconds: number) => string;
  onCancel: () => void;
  onStop: () => void;
}

export function RecordingView({
  videoRef,
  facingMode,
  recordingTime,
  maxDurationSeconds,
  isPremium,
  formatTime,
  onCancel,
  onStop,
}: RecordingViewProps) {
  const timeRemaining = maxDurationSeconds - recordingTime;

  return (
    <div className="space-y-3 rounded-lg border-2 border-red-500 bg-card p-4">
      {/* Live preview */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full rounded-lg bg-black"
        style={{ maxHeight: '400px', transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
      />

      {/* Recording indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
          <span className="text-sm font-medium text-red-500">Recording</span>
        </div>
        <div className="font-mono text-sm">
          {formatTime(recordingTime)}
          {!isPremium && (
            <span className="ml-2 text-xs text-muted-foreground">
              / {formatTime(maxDurationSeconds)}
            </span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onCancel}
          className="flex items-center justify-center gap-2 rounded-lg border-2 border-gray-300 bg-white px-4 py-3 text-gray-700 shadow-sm transition-all hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-gray-500 dark:hover:bg-gray-700"
        >
          <X className="h-5 w-5" />
          <span className="font-medium">Cancel</span>
        </button>
        <button
          onClick={onStop}
          className="flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-white shadow-md transition-all hover:bg-red-700 hover:shadow-lg"
        >
          <StopCircle className="h-5 w-5" />
          <span className="font-medium">Stop</span>
        </button>
      </div>

      {!isPremium && timeRemaining <= 10 && (
        <p className="text-center text-xs text-yellow-600 dark:text-yellow-400">
          {timeRemaining} seconds remaining (upgrade for unlimited)
        </p>
      )}
    </div>
  );
}

// ============================================================================
// CAMERA READY STATE
// ============================================================================

interface CameraReadyViewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  facingMode: 'user' | 'environment';
  maxDurationSeconds: number;
  isPremium: boolean;
  onToggleCamera: () => void;
  onStartRecording: () => void;
}

export const CameraReadyView = forwardRef<HTMLVideoElement, CameraReadyViewProps>(
  function CameraReadyView(
    { videoRef, facingMode, maxDurationSeconds, isPremium, onToggleCamera, onStartRecording },
    _ref
  ) {
    return (
      <div className="space-y-3 rounded-lg border border-border/50 bg-card p-4">
        {/* Live camera preview */}
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full rounded-lg bg-black"
          style={{
            maxHeight: '400px',
            minHeight: '300px',
            width: '100%',
            transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
          }}
        />

        {/* Camera toggle */}
        <div className="flex justify-end">
          <button
            onClick={onToggleCamera}
            className="rounded p-2 hover:bg-muted"
            aria-label="Switch camera"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        {/* Start recording button */}
        <button
          onClick={onStartRecording}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 text-white shadow-md transition-all hover:from-purple-700 hover:to-pink-700 hover:shadow-lg"
        >
          <Camera className="h-5 w-5" />
          <span className="font-medium">Start Recording</span>
        </button>

        {!isPremium && (
          <p className="text-center text-xs text-muted-foreground">
            Free tier: {maxDurationSeconds} seconds max • Upgrade for unlimited
          </p>
        )}
      </div>
    );
  }
);
