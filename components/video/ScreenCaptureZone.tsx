'use client';

/**
 * Screen Capture Zone Component
 * YouTuber-style screen recording with optional camera PiP
 * Pattern: Extends VideoCaptureZone structure for screen sharing
 */

import {
  Monitor,
  Video,
  StopCircle,
  Check,
  AlertCircle,
  X,
  RefreshCw,
  CheckCircle,
  Camera,
  CameraOff,
} from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';

import { useVideoUpload } from '@/hooks/useVideoUpload';
import { AudioMixer } from '@/lib/media/AudioMixer';
import { StreamCompositor, PipPosition } from '@/lib/media/StreamCompositor';

interface ScreenCaptureZoneProps {
  vibelogId: string;
  onVideoCaptured?: (videoUrl: string) => void;
  maxDurationSeconds?: number; // Free tier limit
  isPremium?: boolean;
  enableCameraPip?: boolean; // Allow camera overlay
}

const DEFAULT_MAX_DURATION = 60; // 60 seconds for free tier

export function ScreenCaptureZone({
  vibelogId,
  onVideoCaptured,
  maxDurationSeconds = DEFAULT_MAX_DURATION,
  isPremium = false,
  enableCameraPip = true,
}: ScreenCaptureZoneProps) {
  console.log('[ScreenCaptureZone] Component rendering with vibelogId:', vibelogId);

  // Use video upload hook (same as VideoCaptureZone)
  const { uploadVideo, uploadProgress: uploadProgressState } = useVideoUpload();

  const [status, setStatus] = useState<
    | 'idle'
    | 'requesting-screen'
    | 'screen-ready'
    | 'requesting-camera'
    | 'ready'
    | 'recording'
    | 'preview'
    | 'uploading'
    | 'success'
    | 'error'
  >('idle');
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [hasCameraPip, setHasCameraPip] = useState(false);
  const [pipPosition, setPipPosition] = useState<PipPosition>('bottom-right');

  // Refs
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const compositorRef = useRef<StreamCompositor | null>(null);
  const audioMixerRef = useRef<AudioMixer | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const hasRequestedScreen = useRef(false);

  // Request screen share permission
  const startScreenShare = async () => {
    if (hasRequestedScreen.current) {
      console.log('[ScreenCaptureZone] Screen already requested, skipping');
      return;
    }

    try {
      hasRequestedScreen.current = true;
      setStatus('requesting-screen');
      setError(null);

      console.log('[ScreenCaptureZone] Requesting screen share...');

      // Request screen share with audio
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor', // Prefer full monitor over window/tab
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      console.log('[ScreenCaptureZone] Screen stream obtained:', {
        videoTracks: screenStream.getVideoTracks().length,
        audioTracks: screenStream.getAudioTracks().length,
        active: screenStream.active,
      });

      screenStreamRef.current = screenStream;

      // Request microphone for voice-over
      console.log('[ScreenCaptureZone] Requesting microphone...');
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      console.log('[ScreenCaptureZone] Microphone stream obtained');
      micStreamRef.current = micStream;

      // Listen for screen share stop (user clicked browser's stop button)
      screenStream.getVideoTracks()[0].addEventListener('ended', () => {
        console.log('[ScreenCaptureZone] Screen share stopped by user');
        if (status === 'recording') {
          stopRecording();
        } else {
          cleanup();
          setStatus('idle');
        }
      });

      setStatus('screen-ready');
      console.log('[ScreenCaptureZone] Screen share ready (camera PiP optional)');
    } catch (err: unknown) {
      hasRequestedScreen.current = false;
      let errorMessage = 'Failed to access screen';
      let errorDetails = '';

      if (err instanceof Error) {
        errorMessage = err.message;

        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorDetails = 'Screen share permission denied. Please allow screen access.';
        } else if (err.name === 'NotFoundError') {
          errorDetails = 'No screen available to share.';
        } else if (err.name === 'NotReadableError') {
          errorDetails = 'Screen is already in use by another application.';
        } else if (err.name === 'AbortError') {
          errorDetails = 'Screen share was cancelled.';
        } else {
          errorDetails = errorMessage;
        }
      }

      console.error('[ScreenCaptureZone] Screen share error:', {
        name: err instanceof Error ? err.name : 'Unknown',
        message: errorMessage,
        error: err,
      });

      setError(errorDetails || errorMessage);
      setStatus('error');
    }
  };

  // Add camera PiP overlay
  const addCameraPip = async () => {
    try {
      setStatus('requesting-camera');
      console.log('[ScreenCaptureZone] Requesting camera for PiP...');

      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      console.log('[ScreenCaptureZone] Camera stream obtained for PiP');
      cameraStreamRef.current = cameraStream;
      setHasCameraPip(true);
      setStatus('ready');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access camera';
      console.error('[ScreenCaptureZone] Camera PiP error:', errorMessage);

      // Non-fatal error - continue without camera
      setHasCameraPip(false);
      setStatus('ready');
      console.warn('[ScreenCaptureZone] Camera access failed, continuing without overlay');
    }
  };

  // Remove camera PiP
  const removeCameraPip = () => {
    console.log('[ScreenCaptureZone] Removing camera PiP');

    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }

    setHasCameraPip(false);
    setStatus('screen-ready');
  };

  // Get best supported MIME type
  const getSupportedMimeType = (): string => {
    const types = [
      'video/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log('[ScreenCaptureZone] Selected MIME type:', type);
        return type;
      }
    }

    return 'video/webm';
  };

  // Start recording
  const startRecording = async () => {
    if (!screenStreamRef.current) {
      setError('Screen stream not available');
      return;
    }

    try {
      console.log('[ScreenCaptureZone] Starting recording...');
      chunksRef.current = [];

      // Create compositor (combines screen + camera if enabled)
      const compositor = new StreamCompositor({
        screenStream: screenStreamRef.current,
        cameraStream: cameraStreamRef.current || undefined,
        width: 1920,
        height: 1080,
        fps: 30,
        pipPosition,
        pipSize: 0.25, // 25% of screen width
      });

      const compositeVideoStream = compositor.start();
      compositorRef.current = compositor;

      // Show live preview on canvas
      if (previewCanvasRef.current) {
        const canvas = compositor.getCanvas();
        const ctx = previewCanvasRef.current.getContext('2d');
        const renderPreview = () => {
          if (!ctx || !previewCanvasRef.current) {return;}
          ctx.drawImage(canvas, 0, 0, previewCanvasRef.current.width, previewCanvasRef.current.height);
          if (status === 'recording') {
            requestAnimationFrame(renderPreview);
          }
        };
        renderPreview();
      }

      // Mix audio (screen audio + microphone)
      const audioMixer = new AudioMixer({
        screenVolume: 0.7,
        microphoneVolume: 1.0,
        enableAutoDucking: true, // Lower screen audio when speaking
      });

      const { stream: mixedAudioStream } = await audioMixer.mixStreams({
        screen: screenStreamRef.current,
        microphone: micStreamRef.current || undefined,
      });
      audioMixerRef.current = audioMixer;

      // Combine composite video + mixed audio
      const finalStream = new MediaStream([
        ...compositeVideoStream.getVideoTracks(),
        ...mixedAudioStream.getAudioTracks(),
      ]);

      console.log('[ScreenCaptureZone] Final stream created:', {
        videoTracks: finalStream.getVideoTracks().length,
        audioTracks: finalStream.getAudioTracks().length,
      });

      // Start MediaRecorder
      const mimeType = getSupportedMimeType();
      const options = {
        mimeType,
        videoBitsPerSecond: 2_000_000, // 2 Mbps (higher quality for screen content)
        audioBitsPerSecond: 128_000,
      };

      const mediaRecorder = new MediaRecorder(finalStream, options);

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        console.log('[ScreenCaptureZone] Recording stopped, blob size:', blob.size);
        setVideoBlob(blob);
        cleanup();
        setStatus('preview');
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setStatus('recording');
      setRecordingTime(0);

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;

          // Auto-stop at max duration (if not premium)
          if (!isPremium && newTime >= maxDurationSeconds) {
            stopRecording();
            return maxDurationSeconds;
          }

          return newTime;
        });
      }, 1000);

      console.log('[ScreenCaptureZone] Recording started');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
      console.error('[ScreenCaptureZone] Recording error:', errorMessage, err);
      setError(errorMessage);
      setStatus('error');
      cleanup();
    }
  };

  // Stop recording
  const stopRecording = () => {
    console.log('[ScreenCaptureZone] Stopping recording...');

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  // Cleanup all resources
  const cleanup = () => {
    console.log('[ScreenCaptureZone] Cleaning up resources...');

    // Stop compositor
    if (compositorRef.current) {
      compositorRef.current.stop();
      compositorRef.current = null;
    }

    // Stop audio mixer
    if (audioMixerRef.current) {
      audioMixerRef.current.cleanup();
      audioMixerRef.current = null;
    }

    // Stop all streams
    [screenStreamRef, cameraStreamRef, micStreamRef].forEach(streamRef => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    });

    hasRequestedScreen.current = false;
  };

  // Upload video to server
  const handleUpload = async () => {
    if (!videoBlob) {return;}

    try {
      setStatus('uploading');
      console.log('[ScreenCaptureZone] Uploading video...');

      const result = await uploadVideo({
        vibelogId,
        videoBlob,
        source: 'captured',
        captureMode: hasCameraPip ? 'screen-with-camera' : 'screen',
      });

      console.log('[ScreenCaptureZone] Upload successful:', result.url);
      setStatus('success');
      onVideoCaptured?.(result.url);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      console.error('[ScreenCaptureZone] Upload error:', errorMessage);
      setError(errorMessage);
      setStatus('error');
    }
  };

  // Retake video
  const handleRetake = () => {
    setVideoBlob(null);
    setStatus('idle');
    setHasCameraPip(false);
  };

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="w-full space-y-4">
      {/* Preview Canvas (shown during recording) */}
      {status === 'recording' && (
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <canvas
            ref={previewCanvasRef}
            width={1920}
            height={1080}
            className="w-full h-full object-contain"
          />
          <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-full text-sm font-medium">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            REC {formatTime(recordingTime)}
          </div>
        </div>
      )}

      {/* Video Preview (after recording) */}
      {status === 'preview' && videoBlob && (
        <div className="aspect-video bg-black rounded-lg overflow-hidden">
          <video
            src={URL.createObjectURL(videoBlob)}
            controls
            className="w-full h-full"
          />
        </div>
      )}

      {/* Status Messages */}
      {status === 'idle' && (
        <div className="text-center py-12 space-y-4">
          <Monitor className="w-16 h-16 mx-auto text-gray-400" />
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Screen Share Recording
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Record your screen with optional camera overlay
            </p>
          </div>
        </div>
      )}

      {status === 'requesting-screen' && (
        <div className="text-center py-12">
          <RefreshCw className="w-12 h-12 mx-auto text-blue-500 animate-spin" />
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Requesting screen access...
          </p>
        </div>
      )}

      {status === 'screen-ready' && (
        <div className="text-center py-8 space-y-4">
          <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Screen Ready
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {enableCameraPip
                ? 'Add camera overlay or start recording'
                : 'Ready to start recording'}
            </p>
          </div>
        </div>
      )}

      {status === 'uploading' && (
        <div className="text-center py-12">
          <RefreshCw className="w-12 h-12 mx-auto text-blue-500 animate-spin" />
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Uploading video... {uploadProgressState?.percentage}%
          </p>
        </div>
      )}

      {status === 'success' && (
        <div className="text-center py-12">
          <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
          <p className="mt-4 text-sm text-green-600 dark:text-green-400">
            Screen recording uploaded successfully!
          </p>
        </div>
      )}

      {status === 'error' && error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {status === 'idle' && (
          <button
            onClick={startScreenShare}
            className="flex-1 min-w-[200px] flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Monitor className="w-5 h-5" />
            Share Screen
          </button>
        )}

        {status === 'screen-ready' && enableCameraPip && !hasCameraPip && (
          <button
            onClick={addCameraPip}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg text-sm font-medium transition-colors"
          >
            <Camera className="w-4 h-4" />
            Add Camera
          </button>
        )}

        {status === 'screen-ready' && hasCameraPip && (
          <>
            <button
              onClick={removeCameraPip}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg text-sm font-medium transition-colors"
            >
              <CameraOff className="w-4 h-4" />
              Remove Camera
            </button>

            <select
              value={pipPosition}
              onChange={e => setPipPosition(e.target.value as PipPosition)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg text-sm font-medium"
            >
              <option value="bottom-right">Camera: Bottom Right</option>
              <option value="bottom-left">Camera: Bottom Left</option>
              <option value="top-right">Camera: Top Right</option>
              <option value="top-left">Camera: Top Left</option>
            </select>
          </>
        )}

        {(status === 'screen-ready' || status === 'ready') && (
          <button
            onClick={startRecording}
            className="flex-1 min-w-[200px] flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            <Video className="w-5 h-5" />
            Start Recording
          </button>
        )}

        {status === 'recording' && (
          <button
            onClick={stopRecording}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 hover:bg-black text-white rounded-lg font-medium transition-colors"
          >
            <StopCircle className="w-5 h-5" />
            Stop Recording
          </button>
        )}

        {status === 'preview' && (
          <>
            <button
              onClick={handleRetake}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg text-sm font-medium transition-colors"
            >
              <X className="w-4 h-4" />
              Retake
            </button>

            <button
              onClick={handleUpload}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              <Check className="w-5 h-5" />
              Use This Recording
            </button>
          </>
        )}
      </div>

      {/* Duration Warning (Free Tier) */}
      {!isPremium && status === 'recording' && recordingTime >= maxDurationSeconds - 10 && (
        <p className="text-xs text-orange-600 dark:text-orange-400 text-center">
          {maxDurationSeconds - recordingTime} seconds remaining (free tier limit)
        </p>
      )}
    </div>
  );
}
