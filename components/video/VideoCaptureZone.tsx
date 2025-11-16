'use client';

/**
 * Video Capture Zone Component
 * Camera-based video recording (primary free tier feature)
 * Pattern: Follows MicRecorder/AudioEngine structure for video
 */

import { Video, Camera, StopCircle, RotateCcw, Check, AlertCircle } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';

interface VideoCaptureZoneProps {
  vibelogId: string;
  onVideoCaptured?: (videoUrl: string) => void;
  maxDurationSeconds?: number; // Free tier limit
  isPremium?: boolean;
}

const DEFAULT_MAX_DURATION = 60; // 60 seconds for free tier

export function VideoCaptureZone({
  vibelogId,
  onVideoCaptured,
  maxDurationSeconds = DEFAULT_MAX_DURATION,
  isPremium = false,
}: VideoCaptureZoneProps) {
  const [status, setStatus] = useState<
    'idle' | 'requesting' | 'ready' | 'recording' | 'uploading' | 'success' | 'error'
  >('idle');
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user'); // front or back camera

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Request camera permission and start preview
  const startCameraPreview = async () => {
    try {
      setStatus('requesting');
      setError(null);

      const constraints = {
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setStatus('ready');
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to access camera. Please check permissions.';
      console.error('[VideoCaptureZone] Camera permission error:', errorMessage, err);
      setError(errorMessage);
      setStatus('error');
    }
  };

  // Stop camera preview and release resources
  const stopCameraPreview = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Start recording
  const startRecording = () => {
    if (!mediaStreamRef.current) {
      return;
    }

    try {
      chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4';

      const mediaRecorder = new MediaRecorder(mediaStreamRef.current, {
        mimeType,
      });

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setVideoBlob(blob);

        // Create preview URL
        const previewUrl = URL.createObjectURL(blob);
        setVideoPreview(previewUrl);

        // Stop camera preview
        stopCameraPreview();
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setStatus('recording');
      setRecordingTime(0);

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;

          // Auto-stop at max duration
          if (newTime >= maxDurationSeconds) {
            stopRecording();
            return maxDurationSeconds;
          }

          return newTime;
        });
      }, 1000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
      console.error('[VideoCaptureZone] Recording error:', errorMessage, err);
      setError(errorMessage);
      setStatus('error');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    setStatus('idle');
  };

  // Upload recorded video
  const handleUpload = async () => {
    if (!videoBlob) {
      return;
    }

    try {
      setStatus('uploading');
      setUploadProgress(0);
      setError(null);

      console.log('[VideoCaptureZone] Uploading captured video:', {
        blobSize: videoBlob.size,
        vibelogId,
      });

      // Create FormData
      const formData = new FormData();
      formData.append('video', videoBlob, 'captured-video.webm');
      formData.append('vibelogId', vibelogId);

      // Upload with progress tracking
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', e => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(progress);
        }
      });

      await new Promise<void>((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });

        xhr.open('POST', '/api/vibelog/upload-video');
        xhr.send(formData);
      });

      const responseData = JSON.parse(xhr.responseText);

      if (!responseData.success) {
        throw new Error(responseData.details || responseData.error || 'Upload failed');
      }

      console.log('[VideoCaptureZone] Upload successful:', responseData.url);

      setStatus('success');
      if (onVideoCaptured) {
        onVideoCaptured(responseData.url);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload video';
      console.error('[VideoCaptureZone] Upload error:', errorMessage, err);
      setError(errorMessage);
      setStatus('error');
    }
  };

  // Reset to start over
  const handleReset = () => {
    setVideoBlob(null);
    setVideoPreview(null);
    setRecordingTime(0);
    setError(null);
    setUploadProgress(0);
    setStatus('idle');
    stopCameraPreview();
  };

  // Toggle camera (front/back)
  const toggleCamera = () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    stopCameraPreview();
    // Will auto-restart with new facing mode
  };

  // Auto-start camera preview when component mounts
  useEffect(() => {
    if (status === 'idle' && !videoBlob) {
      startCameraPreview();
    }

    return () => {
      stopCameraPreview();
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, videoBlob, facingMode]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Success state
  if (status === 'success') {
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
          onClick={handleReset}
          className="text-xs text-green-600 hover:underline dark:text-green-400"
        >
          Record another
        </button>
      </div>
    );
  }

  // Uploading state
  if (status === 'uploading') {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <div className="flex items-center gap-3">
          <Video className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Uploading video... {uploadProgress}%
            </p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-blue-200 dark:bg-blue-800">
              <div
                className="h-full bg-blue-600 transition-all dark:bg-blue-400"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (status === 'error' && error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900 dark:text-red-100">Camera error</p>
            <p className="mt-1 text-xs text-red-700 dark:text-red-300">{error}</p>
            <button
              onClick={handleReset}
              className="mt-2 text-xs text-red-600 hover:underline dark:text-red-400"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Video preview (after recording, before upload)
  if (videoBlob && videoPreview) {
    return (
      <div className="space-y-3 rounded-lg border border-border/50 bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Recording complete</p>
            <p className="text-xs text-muted-foreground">Duration: {formatTime(recordingTime)}</p>
          </div>
          <button
            onClick={handleReset}
            className="rounded p-1 hover:bg-muted"
            aria-label="Re-record"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        {/* Video preview */}
        <video
          src={videoPreview}
          controls
          className="w-full rounded-lg bg-black"
          style={{ maxHeight: '400px' }}
        />

        {/* Upload button */}
        <button
          onClick={handleUpload}
          className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:from-purple-700 hover:to-pink-700 hover:shadow-lg"
        >
          Upload Video
        </button>
      </div>
    );
  }

  // Recording state
  if (status === 'recording') {
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

        {/* Stop button */}
        <button
          onClick={stopRecording}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-white shadow-md transition-all hover:bg-red-700 hover:shadow-lg"
        >
          <StopCircle className="h-5 w-5" />
          <span className="font-medium">Stop Recording</span>
        </button>

        {!isPremium && timeRemaining <= 10 && (
          <p className="text-center text-xs text-yellow-600 dark:text-yellow-400">
            {timeRemaining} seconds remaining (upgrade for unlimited)
          </p>
        )}
      </div>
    );
  }

  // Camera preview (ready to record)
  if (status === 'ready') {
    return (
      <div className="space-y-3 rounded-lg border border-border/50 bg-card p-4">
        {/* Live camera preview */}
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full rounded-lg bg-black"
          style={{ maxHeight: '400px', transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
        />

        {/* Camera toggle */}
        <div className="flex justify-end">
          <button
            onClick={toggleCamera}
            className="rounded p-2 hover:bg-muted"
            aria-label="Switch camera"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        {/* Start recording button */}
        <button
          onClick={startRecording}
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

  // Requesting permission
  if (status === 'requesting') {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-border/50 bg-card p-8">
        <Camera className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-sm font-medium">Requesting camera permission...</p>
        <p className="mt-1 text-xs text-muted-foreground">Please allow camera access</p>
      </div>
    );
  }

  // Default: idle (will auto-start camera)
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-border/50 bg-card p-8">
      <Camera className="mb-4 h-12 w-12 text-muted-foreground" />
      <p className="text-sm font-medium">Initializing camera...</p>
    </div>
  );
}
