/**
 * useVideoCapture Hook
 * Handles camera streaming, recording, and video blob management
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export type VideoCaptureStatus =
  | 'idle'
  | 'requesting'
  | 'ready'
  | 'recording'
  | 'preview'
  | 'processing'
  | 'uploading'
  | 'analyzing'
  | 'success'
  | 'complete'
  | 'error';

interface UseVideoCaptureOptions {
  maxDurationSeconds?: number;
}

interface UseVideoCaptureReturn {
  // State
  status: VideoCaptureStatus;
  error: string | null;
  recordingTime: number;
  videoBlob: Blob | null;
  facingMode: 'user' | 'environment';

  // Refs
  videoRef: React.RefObject<HTMLVideoElement | null>;
  mediaStreamRef: React.RefObject<MediaStream | null>;

  // Actions
  startCameraPreview: () => Promise<void>;
  stopCameraPreview: () => void;
  startRecording: () => void;
  stopRecording: () => void;
  cancelRecording: () => void;
  toggleCamera: () => void;
  resetCapture: () => void;

  // State setters (for upload flow)
  setStatus: (status: VideoCaptureStatus) => void;
  setError: (error: string | null) => void;
  setVideoBlob: (blob: Blob | null) => void;

  // Utils
  formatTime: (seconds: number) => string;
}

const DEFAULT_MAX_DURATION = 60;

export function useVideoCapture(options: UseVideoCaptureOptions = {}): UseVideoCaptureReturn {
  const { maxDurationSeconds = DEFAULT_MAX_DURATION } = options;

  // State
  const [status, setStatus] = useState<VideoCaptureStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const hasRequestedCamera = useRef(false);
  const recordingTimeRef = useRef(0);

  // Format time as MM:SS
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Get best supported MIME type
  const getSupportedMimeType = useCallback((): string => {
    const types = [
      'video/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'video/webm';
  }, []);

  // Stop camera preview and release resources
  const stopCameraPreview = useCallback(() => {
    console.log('[useVideoCapture] Stopping camera preview');

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      mediaStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    hasRequestedCamera.current = false;
  }, []);

  // Start camera preview
  const startCameraPreview = useCallback(async () => {
    if (hasRequestedCamera.current) {
      return;
    }

    try {
      hasRequestedCamera.current = true;
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

        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error('Video element not found'));
            return;
          }

          const video = videoRef.current;
          const timeout = setTimeout(() => {
            reject(new Error('Video stream timeout'));
          }, 10000);

          video.onloadedmetadata = async () => {
            clearTimeout(timeout);
            try {
              await video.play();
            } catch (playError) {
              console.error('[useVideoCapture] Play error:', playError);
            }
            resolve();
          };

          video.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('Video element error'));
          };
        });
      }

      setStatus('ready');
    } catch (err: unknown) {
      hasRequestedCamera.current = false;
      let errorDetails = 'Failed to access camera';

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorDetails =
            'Camera permission denied. Please allow camera access in your browser settings.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorDetails = 'No camera found. Please connect a camera and try again.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          errorDetails = 'Camera is already in use by another application.';
        } else if (err.name === 'OverconstrainedError') {
          errorDetails = 'Camera does not support the requested resolution.';
        } else if (err.name === 'SecurityError') {
          errorDetails = 'Camera access blocked by security settings.';
        } else {
          errorDetails = err.message;
        }
      }

      console.error('[useVideoCapture] Camera error:', err);
      setError(errorDetails);
      setStatus('error');
    }
  }, [facingMode]);

  // Start recording
  const startRecording = useCallback(() => {
    if (!mediaStreamRef.current) {
      return;
    }

    try {
      chunksRef.current = [];
      const mimeType = getSupportedMimeType();

      const options = {
        mimeType,
        videoBitsPerSecond: 1_000_000,
        audioBitsPerSecond: 128_000,
      };

      const mediaRecorder = new MediaRecorder(mediaStreamRef.current, options);

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setVideoBlob(blob);
        stopCameraPreview();
        setStatus('preview');
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setStatus('recording');
      setRecordingTime(0);
      recordingTimeRef.current = 0;

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          recordingTimeRef.current = newTime;

          if (newTime >= maxDurationSeconds) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
              mediaRecorderRef.current.stop();
            }
            if (recordingTimerRef.current) {
              clearInterval(recordingTimerRef.current);
              recordingTimerRef.current = null;
            }
            return maxDurationSeconds;
          }

          return newTime;
        });
      }, 1000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
      console.error('[useVideoCapture] Recording error:', errorMessage, err);
      setError(errorMessage);
      setStatus('error');
    }
  }, [maxDurationSeconds, getSupportedMimeType, stopCameraPreview]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    setStatus('idle');
  }, []);

  // Cancel recording
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    chunksRef.current = [];
    setRecordingTime(0);
    setVideoBlob(null);
    setError(null);
    setStatus('ready');
  }, []);

  // Toggle camera
  const toggleCamera = useCallback(() => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    stopCameraPreview();
  }, [facingMode, stopCameraPreview]);

  // Reset capture
  const resetCapture = useCallback(() => {
    setVideoBlob(null);
    setRecordingTime(0);
    setError(null);
    setStatus('idle');
    stopCameraPreview();
  }, [stopCameraPreview]);

  // Auto-restart camera when facing mode changes
  useEffect(() => {
    if (mediaStreamRef.current) {
      stopCameraPreview();
      startCameraPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCameraPreview();
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [stopCameraPreview]);

  return {
    status,
    error,
    recordingTime,
    videoBlob,
    facingMode,
    videoRef,
    mediaStreamRef,
    startCameraPreview,
    stopCameraPreview,
    startRecording,
    stopRecording,
    cancelRecording,
    toggleCamera,
    resetCapture,
    setStatus,
    setError,
    setVideoBlob,
    formatTime,
  };
}
