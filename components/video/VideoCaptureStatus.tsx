/**
 * Video Capture Status Components
 * Displays various states during video capture flow
 */

'use client';

import { Check, Video, AlertCircle, Camera } from 'lucide-react';

// ============================================================================
// SUCCESS STATE
// ============================================================================

interface SuccessStatusProps {
  onReset: () => void;
}

export function SuccessStatus({ onReset }: SuccessStatusProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
      <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
      <div className="flex-1">
        <p className="text-sm font-medium text-green-900 dark:text-green-100">
          Video captured successfully!
        </p>
        <p className="text-xs text-green-700 dark:text-green-300">
          Your video is now part of this vibelog.
        </p>
      </div>
      <button
        onClick={onReset}
        className="text-xs text-green-600 hover:underline dark:text-green-400"
      >
        Record another
      </button>
    </div>
  );
}

// ============================================================================
// UPLOADING STATE
// ============================================================================

interface UploadingStatusProps {
  uploadPercentage: number;
  videoBlob: Blob | null;
  recordingTime: number;
  formatTime: (seconds: number) => string;
}

export function UploadingStatus({
  uploadPercentage,
  videoBlob,
  recordingTime,
  formatTime,
}: UploadingStatusProps) {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
      <div className="flex items-center gap-3">
        <Video className="h-5 w-5 animate-pulse text-blue-600 dark:text-blue-400" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Uploading video... {uploadPercentage}%
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-blue-200 dark:bg-blue-800">
            <div
              className="h-full bg-blue-600 transition-all dark:bg-blue-400"
              style={{ width: `${uploadPercentage}%` }}
            />
          </div>
          {videoBlob && (
            <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
              {(videoBlob.size / (1024 * 1024)).toFixed(1)} MB • {formatTime(recordingTime)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ANALYZING STATE
// ============================================================================

interface AnalyzingStatusProps {
  videoBlob: Blob;
  recordingTime: number;
  formatTime: (seconds: number) => string;
}

export function AnalyzingStatus({ videoBlob, recordingTime, formatTime }: AnalyzingStatusProps) {
  const videoUrl = URL.createObjectURL(videoBlob);

  return (
    <div className="space-y-3 rounded-lg border-2 border-purple-500/30 bg-card p-4">
      {/* Video preview with overlay */}
      <div className="relative">
        <video
          src={videoUrl}
          controls
          playsInline
          className="w-full rounded-lg bg-black"
          style={{ maxHeight: '400px' }}
        />
        {/* Analysis overlay */}
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 backdrop-blur-sm">
          <div className="text-center">
            <div className="mx-auto mb-3 h-12 w-12 animate-spin rounded-full border-4 border-purple-600 border-t-transparent"></div>
            <p className="text-lg font-semibold text-white">Analyzing video...</p>
            <p className="mt-1 text-sm text-white/80">You can replay while we work</p>
          </div>
        </div>
      </div>

      {/* Video info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{(videoBlob.size / (1024 * 1024)).toFixed(1)} MB</span>
        <span>{formatTime(recordingTime)}</span>
      </div>
    </div>
  );
}

// ============================================================================
// ERROR STATE
// ============================================================================

interface ErrorStatusProps {
  error: string;
  onReset: () => void;
}

export function ErrorStatus({ error, onReset }: ErrorStatusProps) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-900 dark:text-red-100">Camera error</p>
          <p className="mt-1 text-xs text-red-700 dark:text-red-300">{error}</p>
          <button
            onClick={onReset}
            className="mt-2 text-xs text-red-600 hover:underline dark:text-red-400"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// REQUESTING PERMISSION STATE
// ============================================================================

export function RequestingStatus() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-border/50 bg-card p-8">
      <Camera className="mb-4 h-12 w-12 text-muted-foreground" />
      <p className="text-sm font-medium">Requesting camera permission...</p>
      <p className="mt-1 text-xs text-muted-foreground">Please allow camera access</p>
    </div>
  );
}

// ============================================================================
// IDLE/INITIALIZING STATE
// ============================================================================

export function IdleStatus() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-border/50 bg-card p-8">
      <Camera className="mb-4 h-12 w-12 text-muted-foreground" />
      <p className="text-sm font-medium">Initializing camera...</p>
    </div>
  );
}
