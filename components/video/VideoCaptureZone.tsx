'use client';

/**
 * Video Capture Zone Component
 * Camera-based video recording with auto-processing
 * Flow: Record -> Processing Animation -> Auto-publish
 */

import {
  Camera,
  StopCircle,
  RotateCcw,
  Check,
  AlertCircle,
  X,
  Video,
  RefreshCw,
  CheckCircle,
} from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';

import { useVideoUpload } from '@/hooks/useVideoUpload';

interface VideoCaptureZoneProps {
  vibelogId?: string; // Optional - will be created during upload if not provided
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
  console.log('[VideoCaptureZone] Component rendering with vibelogId:', vibelogId);

  // Use video upload hook
  const { uploadVideo, uploadProgress: uploadProgressState } = useVideoUpload();

  const [status, setStatus] = useState<
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
    | 'error'
  >('idle');
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const hasRequestedCamera = useRef(false);
  const recordingTimeRef = useRef(0);

  // Request camera permission and start preview
  const startCameraPreview = async () => {
    // Prevent multiple simultaneous requests
    if (hasRequestedCamera.current) {
      console.log('[VideoCaptureZone] Camera already requested, skipping');
      return;
    }

    try {
      hasRequestedCamera.current = true;
      setStatus('requesting');
      setError(null);

      console.log('[VideoCaptureZone] Requesting camera with facingMode:', facingMode);

      const constraints = {
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('[VideoCaptureZone] Camera stream obtained:', {
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length,
        active: stream.active,
      });

      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        console.log('[VideoCaptureZone] Stream assigned to video element');

        // Wait for video to load metadata and play
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error('Video element not found'));
            return;
          }

          const video = videoRef.current;
          const timeout = setTimeout(() => {
            reject(new Error('Video stream timeout'));
          }, 10000); // 10 second timeout

          video.onloadedmetadata = async () => {
            clearTimeout(timeout);
            console.log('[VideoCaptureZone] Video metadata loaded:', {
              width: video.videoWidth,
              height: video.videoHeight,
              duration: video.duration,
            });

            // Explicitly play the video
            try {
              await video.play();
              console.log('[VideoCaptureZone] Video playback started');
              console.log('[VideoCaptureZone] Video element dimensions:', {
                clientWidth: video.clientWidth,
                clientHeight: video.clientHeight,
                offsetWidth: video.offsetWidth,
                offsetHeight: video.offsetHeight,
                videoWidth: video.videoWidth,
                videoHeight: video.videoHeight,
              });
            } catch (playError) {
              console.error('[VideoCaptureZone] Failed to start video playback:', playError);
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
      console.log('[VideoCaptureZone] Camera preview ready');
    } catch (err: unknown) {
      hasRequestedCamera.current = false; // Allow retry
      let errorMessage = 'Failed to access camera';
      let errorDetails = '';

      if (err instanceof Error) {
        errorMessage = err.message;

        // Provide helpful error messages
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
          errorDetails = errorMessage;
        }
      }

      console.error('[VideoCaptureZone] Camera error:', {
        name: err instanceof Error ? err.name : 'Unknown',
        message: errorMessage,
        error: err,
      });

      setError(errorDetails || errorMessage);
      setStatus('error');
    }
  };

  // Stop camera preview and release resources
  const stopCameraPreview = () => {
    console.log('[VideoCaptureZone] Stopping camera preview');

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        console.log('[VideoCaptureZone] Stopping track:', track.kind, track.label);
        track.stop();
      });
      mediaStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    hasRequestedCamera.current = false; // Allow re-requesting
  };

  // Get best supported MIME type for this browser
  const getSupportedMimeType = (): string => {
    // Priority order: MP4 for Safari, WebM for Chrome/Firefox
    const types = [
      'video/mp4', // Safari (iOS and desktop), universal playback
      'video/webm;codecs=vp9,opus', // Modern Chrome/Firefox
      'video/webm;codecs=vp8,opus', // Older Chrome/Firefox
      'video/webm', // Fallback
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log('[VideoCaptureZone] Selected MIME type:', type);
        return type;
      }
    }

    console.warn('[VideoCaptureZone] No preferred MIME type supported, using default');
    return 'video/webm';
  };

  // Start recording
  const startRecording = () => {
    if (!mediaStreamRef.current) {
      return;
    }

    try {
      chunksRef.current = [];
      const mimeType = getSupportedMimeType();

      // Client-side compression settings
      // Note: iOS Safari may ignore videoBitsPerSecond, but Chrome/Firefox honor it
      const options = {
        mimeType,
        videoBitsPerSecond: 1_000_000, // 1 Mbps (reduces 60s video from ~40MB to ~10MB on Chrome)
        audioBitsPerSecond: 128_000, // 128 kbps (good quality for transcription)
      };

      const mediaRecorder = new MediaRecorder(mediaStreamRef.current, options);

      // Log actual bitrate used (may differ from requested)
      console.log('[VideoCaptureZone] MediaRecorder configured:', {
        requestedVideoBitrate: options.videoBitsPerSecond,
        requestedAudioBitrate: options.audioBitsPerSecond,
        mimeType: mediaRecorder.mimeType,
      });

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setVideoBlob(blob);

        // Stop camera preview
        stopCameraPreview();

        // Go to preview state - user confirms before upload
        console.log('📹 [RECORDING-COMPLETE] Going to preview...');
        setStatus('preview');
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setStatus('recording');
      setRecordingTime(0);
      recordingTimeRef.current = 0;

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          recordingTimeRef.current = newTime;

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

  // Cancel recording (discard video and restart camera preview)
  const cancelRecording = () => {
    console.log('[VideoCaptureZone] Canceling recording...');

    // Stop MediaRecorder without processing the data
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      // Remove the onstop handler to prevent auto-upload
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    // Clear timer
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    // Discard chunks
    chunksRef.current = [];

    // Reset state and restart camera preview
    setRecordingTime(0);
    setVideoBlob(null);
    setError(null);
    setStatus('ready');

    console.log('✅ [VideoCaptureZone] Recording canceled, camera preview restarted');
  };

  // Upload video (triggered by user confirmation after preview)
  const confirmAndUploadVideo = async () => {
    if (!videoBlob) {
      console.error('❌ [UPLOAD] No video blob available');
      return;
    }

    try {
      setStatus('uploading');
      setError(null);

      // Step 1: Create vibelog if not provided
      let currentVibelogId = vibelogId;
      if (!currentVibelogId) {
        console.log('📝 [UPLOAD] Creating vibelog for video...');
        // Include timestamp and random suffix to ensure unique slug generation
        const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        const createResponse = await fetch('/api/save-vibelog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `Video vibelog ${uniqueId} (processing...)`,
            isPublished: false,
          }),
        });

        const createResult = await createResponse.json();

        // Check both response.ok AND result.vibelogId exists
        if (!createResponse.ok || !createResult.vibelogId) {
          throw new Error(createResult.message || createResult.error || 'Failed to create vibelog');
        }

        currentVibelogId = createResult.vibelogId;
        console.log('✅ [UPLOAD] Vibelog created:', currentVibelogId);
      }

      // Step 2: Upload video
      console.log('📹 [UPLOAD] Uploading video...', {
        blobSize: videoBlob.size,
        vibelogId: currentVibelogId,
      });

      const result = await uploadVideo({
        videoBlob,
        vibelogId: currentVibelogId!,
        source: 'captured',
        captureMode: 'camera',
      });

      console.log('✅ [UPLOAD] Upload successful:', result.url);

      // Step 3: Analyze video to generate title & description
      setStatus('analyzing');
      console.log('🔍 [ANALYZE] Analyzing video content...');

      const analyzeResponse = await fetch('/api/video/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vibelogId: currentVibelogId }),
      });

      if (!analyzeResponse.ok) {
        // Analysis failed, but video is uploaded - still show success
        console.error('❌ [ANALYZE] Analysis failed, but video was uploaded successfully');
        setStatus('success');
        if (onVideoCaptured) {
          onVideoCaptured(result.url);
        }
        return;
      }

      const analysisResult = await analyzeResponse.json();
      console.log('✅ [ANALYZE] Analysis complete:', {
        title: analysisResult.title,
        contentLength: analysisResult.content?.length,
        teaserLength: analysisResult.teaser?.length,
        hasTranscript: !!analysisResult.transcription,
        detectedLanguage: analysisResult.detectedLanguage,
      });

      // Step 4: Update vibelog with generated content AND auto-publish
      // - content: Full AI-generated story (always in English for video vibelogs)
      // - teaser: Short hook for cards/previews (always in English)
      // - transcript: Original voice transcription (in original spoken language)
      // NOTE: We intentionally do NOT pass originalLanguage for video vibelogs
      // because content is always English. The translation system will generate
      // translations FROM English TO all other languages including the original spoken language.
      // The "Original" tab shows the raw transcript in the spoken language.
      const updateResponse = await fetch('/api/save-vibelog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vibelogId: currentVibelogId,
          title: analysisResult.title,
          content: analysisResult.content, // Full AI-generated content (in English)
          teaser: analysisResult.teaser,   // Short teaser for cards (in English)
          transcript: analysisResult.transcription, // Original transcript in spoken language (e.g., French)
          // Note: original_language defaults to 'en' - correct for video vibelogs since content is English
          isPublished: true, // Auto-publish video vibelogs
          isPublic: true,
        }),
      });

      if (!updateResponse.ok) {
        console.error('❌ [UPDATE] Failed to update vibelog with analysis');
      } else {
        console.log('✅ [PUBLISH] Video vibelog auto-published to community');
      }

      // Notify parent component
      if (onVideoCaptured) {
        onVideoCaptured(result.url);
      }

      setStatus('success');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload video';
      console.error('❌ [UPLOAD] Upload error:', errorMessage, err);
      setError(errorMessage);
      setStatus('error');
    }
  };

  // Re-record: discard current video and start camera preview again
  const handleRerecord = () => {
    console.log('[VideoCaptureZone] User requested re-record');

    // Discard current video
    setVideoBlob(null);
    setRecordingTime(0);
    chunksRef.current = [];
    setError(null);

    // Restart camera preview
    setStatus('idle');
  };

  // Reset to start over
  const handleReset = () => {
    setVideoBlob(null);
    setRecordingTime(0);
    setError(null);
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

  // Auto-start camera preview when component mounts or facingMode changes
  // Initialize camera on mount
  useEffect(() => {
    console.log('[VideoCaptureZone] useEffect (mount) running');
    let mounted = true;

    const initCamera = async () => {
      console.log('[VideoCaptureZone] initCamera called with:', {
        status,
        videoBlob: videoBlob ? 'exists' : 'null',
        mounted,
      });

      if (status === 'idle' && !videoBlob && mounted) {
        console.log('[VideoCaptureZone] Conditions met, calling startCameraPreview');
        await startCameraPreview();
      } else {
        console.log('[VideoCaptureZone] Conditions NOT met:', {
          statusIsIdle: status === 'idle',
          noVideoBlob: !videoBlob,
          mounted,
        });
      }
    };

    initCamera();

    return () => {
      console.log('[VideoCaptureZone] useEffect cleanup');
      mounted = false;
      stopCameraPreview();
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount

  // Handle facing mode changes
  useEffect(() => {
    if (mediaStreamRef.current) {
      console.log('[VideoCaptureZone] Facing mode changed, restarting camera');
      stopCameraPreview();
      startCameraPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  // Ensure stream is attached when status becomes 'ready' or 'recording'
  useEffect(() => {
    if (
      (status === 'ready' || status === 'recording') &&
      videoRef.current &&
      mediaStreamRef.current
    ) {
      if (videoRef.current.srcObject !== mediaStreamRef.current) {
        console.log('[VideoCaptureZone] useEffect: Attaching stream to video element');
        videoRef.current.srcObject = mediaStreamRef.current;
        videoRef.current.play().catch(err => {
          console.error('[VideoCaptureZone] useEffect: Play error:', err);
        });
      }
    }
  }, [status]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Success state (legacy)
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
    const uploadPercentage = uploadProgressState?.percentage || 0;

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

  // Analyzing state - show video preview with overlay
  if (status === 'analyzing' && videoBlob) {
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

  // Video preview state - show video with confirmation buttons
  if (status === 'preview' && videoBlob) {
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
            onClick={handleRerecord}
            className="flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Re-record</span>
          </button>
          <button
            onClick={confirmAndUploadVideo}
            className="flex items-center justify-center gap-2 rounded-lg bg-electric px-4 py-2.5 text-sm font-medium text-white hover:bg-electric/90"
          >
            <CheckCircle className="h-4 w-4" />
            <span>Use This Video</span>
          </button>
        </div>
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

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={cancelRecording}
            className="flex items-center justify-center gap-2 rounded-lg border-2 border-gray-300 bg-white px-4 py-3 text-gray-700 shadow-sm transition-all hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-gray-500 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
            <span className="font-medium">Cancel</span>
          </button>
          <button
            onClick={stopRecording}
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

  // Camera preview (ready to record)
  if (status === 'ready') {
    console.log('[VideoCaptureZone] Rendering ready state with video element');
    console.log('[VideoCaptureZone] mediaStreamRef.current:', mediaStreamRef.current);

    // Re-attach stream if video element lost it during re-render
    if (videoRef.current && mediaStreamRef.current && !videoRef.current.srcObject) {
      console.log('[VideoCaptureZone] Re-attaching stream to video element');
      videoRef.current.srcObject = mediaStreamRef.current;
      videoRef.current.play().catch(err => console.error('[VideoCaptureZone] Play error:', err));
    }

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
