'use client';

/**
 * Screen Capture Zone Component
 * YouTuber-style screen recording with optional camera PiP
 * Pattern: Extends VideoCaptureZone structure for screen sharing
 *
 * Features:
 * - Live screen preview before recording
 * - Camera PiP overlay with drag-to-position
 * - Smooth framer-motion animations
 * - Google Meet-envy worthy UI
 */

import { motion, AnimatePresence } from 'framer-motion';
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
  Sparkles,
} from 'lucide-react';
import React, { useState, useRef, useEffect, useCallback } from 'react';

import { useVideoUpload } from '@/hooks/useVideoUpload';
import { AudioMixer } from '@/lib/media/AudioMixer';
import { StreamCompositor, PipPosition } from '@/lib/media/StreamCompositor';

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.4 },
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.3 },
};

const pipAnimation = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.8 },
  transition: { type: 'spring' as const, stiffness: 300, damping: 25 },
};

const pipPositionStyles: Record<PipPosition, string> = {
  'bottom-right': 'bottom-3 right-3 sm:bottom-4 sm:right-4',
  'bottom-left': 'bottom-3 left-3 sm:bottom-4 sm:left-4',
  'top-right': 'top-3 right-3 sm:top-4 sm:right-4',
  'top-left': 'top-3 left-3 sm:top-4 sm:left-4',
};

interface ScreenCaptureZoneProps {
  vibelogId: string;
  onVideoCaptured?: (videoUrl: string) => void;
  maxDurationSeconds?: number;
  isPremium?: boolean;
  enableCameraPip?: boolean;
}

const DEFAULT_MAX_DURATION = 60;

export function ScreenCaptureZone({
  vibelogId,
  onVideoCaptured,
  maxDurationSeconds = DEFAULT_MAX_DURATION,
  isPremium = false,
  enableCameraPip = true,
}: ScreenCaptureZoneProps) {
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
  const [screenStreamReady, setScreenStreamReady] = useState(false);
  const [cameraStreamReady, setCameraStreamReady] = useState(false);

  // Refs
  const screenPreviewRef = useRef<HTMLVideoElement>(null);
  const cameraPreviewRef = useRef<HTMLVideoElement>(null);
  const cameraRecordingRef = useRef<HTMLVideoElement>(null);
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
  const animationFrameRef = useRef<number | null>(null);

  // Attach screen stream to preview video element
  const attachScreenPreview = useCallback((stream: MediaStream) => {
    if (screenPreviewRef.current) {
      screenPreviewRef.current.srcObject = stream;
      screenPreviewRef.current.play().catch(console.error);
    }
  }, []);

  // Attach camera stream to preview video element
  const attachCameraPreview = useCallback((stream: MediaStream) => {
    if (cameraPreviewRef.current) {
      cameraPreviewRef.current.srcObject = stream;
      cameraPreviewRef.current.play().catch(console.error);
    }
  }, []);

  // Re-attach streams when video elements are mounted (handles state transitions)
  useEffect(() => {
    if (
      screenStreamRef.current &&
      screenPreviewRef.current &&
      !screenPreviewRef.current.srcObject
    ) {
      screenPreviewRef.current.srcObject = screenStreamRef.current;
      screenPreviewRef.current.play().catch(console.error);
    }
  }, [status, screenStreamReady]);

  useEffect(() => {
    if (
      cameraStreamRef.current &&
      cameraPreviewRef.current &&
      !cameraPreviewRef.current.srcObject
    ) {
      cameraPreviewRef.current.srcObject = cameraStreamRef.current;
      cameraPreviewRef.current.play().catch(console.error);
    }
    if (
      cameraStreamRef.current &&
      cameraRecordingRef.current &&
      !cameraRecordingRef.current.srcObject
    ) {
      cameraRecordingRef.current.srcObject = cameraStreamRef.current;
      cameraRecordingRef.current.play().catch(console.error);
    }
  }, [status, cameraStreamReady, hasCameraPip]);

  // Request screen share permission
  const startScreenShare = async () => {
    if (hasRequestedScreen.current) {
      return;
    }

    try {
      hasRequestedScreen.current = true;
      setStatus('requesting-screen');
      setError(null);

      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      screenStreamRef.current = screenStream;
      attachScreenPreview(screenStream);
      setScreenStreamReady(true);

      // Request microphone for voice-over
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });
      micStreamRef.current = micStream;

      // Listen for screen share stop
      screenStream.getVideoTracks()[0].addEventListener('ended', () => {
        if (status === 'recording') {
          stopRecording();
        } else {
          cleanup();
          setStatus('idle');
        }
      });

      setStatus('screen-ready');
    } catch (err: unknown) {
      hasRequestedScreen.current = false;
      let errorDetails = 'Failed to access screen';

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorDetails = 'Screen share permission denied. Please allow screen access.';
        } else if (err.name === 'NotFoundError') {
          errorDetails = 'No screen available to share.';
        } else if (err.name === 'NotReadableError') {
          errorDetails = 'Screen is already in use by another application.';
        } else if (err.name === 'AbortError') {
          errorDetails = 'Screen share was cancelled.';
        } else {
          errorDetails = err.message;
        }
      }

      setError(errorDetails);
      setStatus('error');
    }
  };

  // Add camera PiP overlay
  const addCameraPip = async () => {
    try {
      setStatus('requesting-camera');

      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      cameraStreamRef.current = cameraStream;
      attachCameraPreview(cameraStream);
      setCameraStreamReady(true);
      setHasCameraPip(true);
      setStatus('ready');
    } catch {
      // Non-fatal - continue without camera
      setHasCameraPip(false);
      setCameraStreamReady(false);
      setStatus('screen-ready');
    }
  };

  // Remove camera PiP
  const removeCameraPip = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }
    setCameraStreamReady(false);
    if (cameraPreviewRef.current) {
      cameraPreviewRef.current.srcObject = null;
    }
    setHasCameraPip(false);
    setStatus('screen-ready');
  };

  // Cycle through PiP positions
  const cyclePipPosition = () => {
    const positions: PipPosition[] = ['bottom-right', 'bottom-left', 'top-left', 'top-right'];
    const currentIndex = positions.indexOf(pipPosition);
    const nextIndex = (currentIndex + 1) % positions.length;
    setPipPosition(positions[nextIndex]);
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
      chunksRef.current = [];

      // Create compositor
      const compositor = await StreamCompositor.create({
        screenStream: screenStreamRef.current,
        cameraStream: cameraStreamRef.current || undefined,
        width: 1920,
        height: 1080,
        fps: 30,
        pipPosition,
        pipSize: 0.25,
      });

      const compositeVideoStream = compositor.start();
      compositorRef.current = compositor;

      // Attach camera stream to recording preview element
      if (cameraStreamRef.current && cameraRecordingRef.current) {
        cameraRecordingRef.current.srcObject = cameraStreamRef.current;
        cameraRecordingRef.current.play().catch(console.error);
      }

      // Live preview on canvas
      if (previewCanvasRef.current) {
        const canvas = compositor.getCanvas();
        const ctx = previewCanvasRef.current.getContext('2d');

        const renderPreview = () => {
          if (!ctx || !previewCanvasRef.current) {
            return;
          }
          ctx.drawImage(
            canvas,
            0,
            0,
            previewCanvasRef.current.width,
            previewCanvasRef.current.height
          );
          animationFrameRef.current = requestAnimationFrame(renderPreview);
        };
        renderPreview();
      }

      // Mix audio
      const audioMixer = new AudioMixer({
        screenVolume: 0.7,
        microphoneVolume: 1.0,
        enableAutoDucking: true,
      });

      const { stream: mixedAudioStream } = await audioMixer.mixStreams({
        screen: screenStreamRef.current,
        microphone: micStreamRef.current || undefined,
      });
      audioMixerRef.current = audioMixer;

      // Combine streams
      const finalStream = new MediaStream([
        ...compositeVideoStream.getVideoTracks(),
        ...mixedAudioStream.getAudioTracks(),
      ]);

      // Start MediaRecorder
      const mimeType = getSupportedMimeType();
      const mediaRecorder = new MediaRecorder(finalStream, {
        mimeType,
        videoBitsPerSecond: 2_000_000,
        audioBitsPerSecond: 128_000,
      });

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
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
          if (!isPremium && newTime >= maxDurationSeconds) {
            stopRecording();
            return maxDurationSeconds;
          }
          return newTime;
        });
      }, 1000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
      setError(errorMessage);
      setStatus('error');
      cleanup();
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

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
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (compositorRef.current) {
      compositorRef.current.stop();
      compositorRef.current = null;
    }

    if (audioMixerRef.current) {
      audioMixerRef.current.cleanup();
      audioMixerRef.current = null;
    }

    [screenStreamRef, cameraStreamRef, micStreamRef].forEach(streamRef => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    });

    if (screenPreviewRef.current) {
      screenPreviewRef.current.srcObject = null;
    }
    if (cameraPreviewRef.current) {
      cameraPreviewRef.current.srcObject = null;
    }

    setScreenStreamReady(false);
    setCameraStreamReady(false);
    hasRequestedScreen.current = false;
  };

  // Upload video
  const handleUpload = async () => {
    if (!videoBlob) {
      return;
    }

    try {
      setStatus('uploading');

      const result = await uploadVideo({
        vibelogId,
        videoBlob,
        source: 'captured',
        captureMode: hasCameraPip ? 'screen-with-camera' : 'screen',
      });

      setStatus('success');
      onVideoCaptured?.(result.url);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      setStatus('error');
    }
  };

  // Retake
  const handleRetake = () => {
    setVideoBlob(null);
    setStatus('idle');
    setHasCameraPip(false);
  };

  // Format time
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

  // Check if we should show live preview
  const showLivePreview =
    status === 'screen-ready' || status === 'ready' || status === 'requesting-camera';

  return (
    <div className="w-full space-y-4">
      <AnimatePresence mode="wait">
        {/* LIVE PREVIEW - Screen Ready / Ready states */}
        {showLivePreview && (
          <motion.div
            key="live-preview"
            {...scaleIn}
            className="relative aspect-video overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 shadow-2xl ring-1 ring-white/10"
          >
            {/* Screen Preview */}
            <video
              ref={screenPreviewRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-contain"
            />

            {/* Gradient overlay for better visibility */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

            {/* Camera PiP Thumbnail */}
            <AnimatePresence>
              {hasCameraPip && (
                <motion.div
                  {...pipAnimation}
                  className={`absolute ${pipPositionStyles[pipPosition]} z-10`}
                >
                  <div
                    className="group relative cursor-pointer overflow-hidden rounded-xl shadow-2xl ring-2 ring-white/20 transition-all hover:ring-white/40"
                    onClick={cyclePipPosition}
                  >
                    <video
                      ref={cameraPreviewRef}
                      autoPlay
                      playsInline
                      muted
                      className="h-20 w-28 object-cover sm:h-28 sm:w-40"
                    />
                    {/* Hover overlay with position hint */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="text-xs font-medium text-white">Click to move</span>
                    </div>
                    {/* Live indicator */}
                    <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-green-500/90 px-2 py-0.5 text-[10px] font-bold text-white">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                      LIVE
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Ready Badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-green-500/90 px-3 py-1.5 text-sm font-medium text-white shadow-lg backdrop-blur-sm"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Screen Ready</span>
            </motion.div>

            {/* Add/Remove Camera Button (floating) */}
            {enableCameraPip && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="absolute bottom-4 left-4"
              >
                {!hasCameraPip ? (
                  <button
                    onClick={addCameraPip}
                    className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition-all hover:scale-105 hover:bg-white/20"
                  >
                    <Camera className="h-4 w-4" />
                    Add Camera
                  </button>
                ) : (
                  <button
                    onClick={removeCameraPip}
                    className="flex items-center gap-2 rounded-full bg-red-500/80 px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition-all hover:scale-105 hover:bg-red-500"
                  >
                    <CameraOff className="h-4 w-4" />
                    Remove
                  </button>
                )}
              </motion.div>
            )}
          </motion.div>
        )}

        {/* RECORDING STATE - Minimal overlay like Google Meet */}
        {status === 'recording' && (
          <motion.div
            key="recording"
            {...scaleIn}
            className="relative aspect-video overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 shadow-2xl"
          >
            {/* Hidden canvas for compositor (still needed for recording) */}
            <canvas ref={previewCanvasRef} width={1920} height={1080} className="hidden" />

            {/* Recording visualization */}
            <div className="flex h-full flex-col items-center justify-center">
              {/* Animated recording ring */}
              <div className="relative">
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -inset-4 rounded-full bg-red-500/20"
                />
                <motion.div
                  animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -inset-2 rounded-full bg-red-500/30"
                />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-red-600 shadow-lg shadow-red-500/50">
                  <Monitor className="h-10 w-10 text-white" />
                </div>
              </div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-6 text-lg font-medium text-white"
              >
                Recording your screen...
              </motion.p>
              <p className="mt-1 text-sm text-gray-400">Your screen is being captured</p>
            </div>

            {/* Camera PiP during recording */}
            {hasCameraPip && cameraStreamReady && (
              <motion.div
                {...pipAnimation}
                className={`absolute ${pipPositionStyles[pipPosition]} z-10`}
              >
                <div className="overflow-hidden rounded-xl shadow-2xl ring-2 ring-white/30">
                  <video
                    ref={cameraRecordingRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-24 w-32 object-cover sm:h-32 sm:w-44"
                  />
                  <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-red-600/90 px-2 py-0.5 text-[10px] font-bold text-white">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                    LIVE
                  </div>
                </div>
              </motion.div>
            )}

            {/* Recording timer badge */}
            <motion.div
              animate={{
                boxShadow: ['0 0 0 0 rgba(239, 68, 68, 0.4)', '0 0 0 8px rgba(239, 68, 68, 0)'],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-lg"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="h-2.5 w-2.5 rounded-full bg-white"
              />
              <span>REC</span>
              <span className="tabular-nums">{formatTime(recordingTime)}</span>
            </motion.div>

            {/* Duration warning */}
            {!isPremium && recordingTime >= maxDurationSeconds - 10 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-orange-500/90 px-4 py-2 text-sm font-medium text-white shadow-lg"
              >
                {maxDurationSeconds - recordingTime}s remaining
              </motion.div>
            )}
          </motion.div>
        )}

        {/* PREVIEW STATE - After recording */}
        {status === 'preview' && videoBlob && (
          <motion.div
            key="preview"
            {...scaleIn}
            className="relative aspect-video overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10"
          >
            <video src={URL.createObjectURL(videoBlob)} controls className="h-full w-full" />
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
              <Sparkles className="h-4 w-4" />
              <span>Preview</span>
            </div>
          </motion.div>
        )}

        {/* IDLE STATE */}
        {status === 'idle' && (
          <motion.div
            key="idle"
            {...fadeInUp}
            className="flex aspect-video flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 dark:border-gray-700 dark:from-gray-900 dark:to-gray-800"
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-4"
            >
              <Monitor className="h-10 w-10 text-white" />
            </motion.div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Ready to capture magic?
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Share your screen to get started
            </p>
          </motion.div>
        )}

        {/* REQUESTING SCREEN */}
        {status === 'requesting-screen' && (
          <motion.div
            key="requesting-screen"
            {...fadeInUp}
            className="flex aspect-video flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <RefreshCw className="h-12 w-12 text-blue-500" />
            </motion.div>
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Waiting for screen access...
            </p>
          </motion.div>
        )}

        {/* UPLOADING */}
        {status === 'uploading' && (
          <motion.div
            key="uploading"
            {...fadeInUp}
            className="flex aspect-video flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-green-500/10 to-blue-500/10"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <RefreshCw className="h-12 w-12 text-green-500" />
            </motion.div>
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Uploading... {uploadProgressState?.percentage || 0}%
            </p>
            {/* Progress bar */}
            <div className="mt-4 h-2 w-48 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgressState?.percentage || 0}%` }}
                className="h-full bg-gradient-to-r from-green-500 to-blue-500"
              />
            </div>
          </motion.div>
        )}

        {/* SUCCESS */}
        {status === 'success' && (
          <motion.div
            key="success"
            {...fadeInUp}
            className="flex aspect-video flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="rounded-full bg-green-500 p-4"
            >
              <CheckCircle className="h-12 w-12 text-white" />
            </motion.div>
            <p className="mt-4 text-lg font-semibold text-green-600 dark:text-green-400">
              Recording uploaded!
            </p>
          </motion.div>
        )}

        {/* ERROR */}
        {status === 'error' && error && (
          <motion.div
            key="error"
            {...fadeInUp}
            className="flex aspect-video flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-red-500/10 to-orange-500/10"
          >
            <div className="rounded-full bg-red-500 p-4">
              <AlertCircle className="h-12 w-12 text-white" />
            </div>
            <p className="mt-4 text-center text-sm text-red-600 dark:text-red-400">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ACTION BUTTONS */}
      <motion.div
        className="flex flex-wrap gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {status === 'idle' && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={startScreenShare}
            className="flex min-w-[200px] flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 font-semibold text-white shadow-lg transition-shadow hover:shadow-xl"
          >
            <Monitor className="h-5 w-5" />
            Share Screen
          </motion.button>
        )}

        {(status === 'screen-ready' || status === 'ready') && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={startRecording}
            className="flex min-w-[200px] flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 font-semibold text-white shadow-lg transition-shadow hover:shadow-xl"
          >
            <Video className="h-5 w-5" />
            Start Recording
          </motion.button>
        )}

        {status === 'recording' && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={stopRecording}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-4 font-semibold text-white shadow-lg transition-shadow hover:bg-black hover:shadow-xl dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
          >
            <StopCircle className="h-5 w-5" />
            Stop Recording
          </motion.button>
        )}

        {status === 'preview' && (
          <>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleRetake}
              className="flex items-center gap-2 rounded-xl border border-gray-300 px-6 py-3 font-medium transition-colors hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
            >
              <X className="h-5 w-5" />
              Retake
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleUpload}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4 font-semibold text-white shadow-lg transition-shadow hover:shadow-xl"
            >
              <Check className="h-5 w-5" />
              Use This Recording
            </motion.button>
          </>
        )}

        {status === 'error' && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRetake}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-100 px-6 py-4 font-semibold text-gray-900 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
          >
            <RefreshCw className="h-5 w-5" />
            Try Again
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}
