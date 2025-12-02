/**
 * Video Comment Input Component
 * Camera-based video recording for comments
 */

'use client';

import { Video, Send, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';

import { useI18n } from '@/components/providers/I18nProvider';
import { createClient } from '@/lib/supabase';

interface VideoCommentInputProps {
  vibelogId: string;
  parentCommentId?: string;
  onCommentAdded: () => void;
}

export default function VideoCommentInput({
  vibelogId,
  parentCommentId,
  onCommentAdded,
}: VideoCommentInputProps) {
  const { t } = useI18n();
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<number | null>(null);

  // Create and cleanup blob URL for video preview
  useEffect(() => {
    if (videoBlob) {
      const url = URL.createObjectURL(videoBlob);
      setVideoBlobUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setVideoBlobUrl(null);
    }
  }, [videoBlob]);

  // Auto-start camera preview
  useEffect(() => {
    if (!videoStream && !videoBlob) {
      startCameraPreview();
    }

    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCameraPreview = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });

      setVideoStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (error) {
      console.error('Error starting camera preview:', error);
      toast.error(t('toasts.comments.cameraFailed'));
    }
  };

  const startVideoRecording = () => {
    if (!videoStream) {
      toast.error(t('toasts.comments.cameraNotReady'));
      return;
    }

    try {
      const mediaRecorder = new MediaRecorder(videoStream, {
        mimeType: 'video/webm;codecs=vp9',
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        setVideoBlob(blob);
        setIsRecordingVideo(false);

        // Stop camera after recording
        if (videoStream) {
          videoStream.getTracks().forEach(track => track.stop());
          setVideoStream(null);
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecordingVideo(true);
      setRecordingTime(0);

      // Start timer with 60-second limit
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          if (newTime >= 60) {
            stopVideoRecording();
            toast.info(t('toasts.comments.maxRecordingTime'));
          }
          return newTime;
        });
      }, 1000);
    } catch (error) {
      console.error('Error starting video recording:', error);
      toast.error(t('toasts.comments.recordingFailed'));
    }
  };

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && isRecordingVideo) {
      mediaRecorderRef.current.stop();
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const cancelVideoRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    setIsRecordingVideo(false);
    setRecordingTime(0);
    startCameraPreview();
  };

  const resetVideoRecording = () => {
    setVideoBlob(null);
    setIsRecordingVideo(false);
    setRecordingTime(0);
    startCameraPreview();
  };

  const handleSubmit = async () => {
    if (!videoBlob) {
      toast.error(t('toasts.comments.recordVideo'));
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('You must be logged in to post video comments');
      }

      // Generate storage path
      const timestamp = Date.now();
      const randomHash = Math.random().toString(36).substring(2, 10);
      const path = `users/${user.id}/comments/video/${vibelogId}/${timestamp}-${randomHash}.webm`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('vibelogs')
        .upload(path, videoBlob, {
          contentType: 'video/webm',
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Failed to upload video: ${uploadError.message}`);
      }

      // Generate public URL
      const videoUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/vibelogs/${path}`;

      // Create comment with video URL
      const commentResponse = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vibelogId,
          videoUrl,
          parentCommentId,
        }),
      });

      if (!commentResponse.ok) {
        const error = await commentResponse.json();
        throw new Error(error.error || 'Failed to submit comment');
      }

      toast.success(t('toasts.comments.videoLive'));
      resetVideoRecording();
      onCommentAdded();
    } catch (error) {
      console.error('Error submitting video comment:', error);
      toast.error(error instanceof Error ? error.message : t('toasts.comments.submitFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Camera Preview (only show when not recorded) */}
      {!videoBlob && (
        <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border/30 bg-black">
          <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
          {isRecordingVideo && (
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-red-500 px-3 py-1">
              <div className="h-2 w-2 animate-pulse rounded-full bg-white" />
              <span className="text-sm font-medium text-white">{recordingTime}/60</span>
            </div>
          )}
        </div>
      )}

      {/* Recorded Video Preview */}
      {videoBlobUrl && videoBlob && (
        <div className="overflow-hidden rounded-lg border border-border/30 bg-black">
          <video
            key={videoBlobUrl}
            src={videoBlobUrl}
            controls
            playsInline
            autoPlay
            className="w-full"
          />
        </div>
      )}

      {/* Recording Controls */}
      <div className="flex items-center justify-center gap-3">
        {!isRecordingVideo && !videoBlob && (
          <button
            onClick={startVideoRecording}
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-electric px-6 py-3 text-white transition-all hover:bg-electric-glow disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Video className="h-5 w-5" />
            Start Recording
          </button>
        )}
        {isRecordingVideo && (
          <>
            <button
              onClick={cancelVideoRecording}
              className="flex items-center gap-2 rounded-lg border border-border/50 bg-background px-4 py-2 text-foreground transition-colors hover:bg-muted"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              onClick={stopVideoRecording}
              className="flex items-center gap-2 rounded-lg bg-red-500 px-6 py-3 text-white transition-all hover:bg-red-600"
            >
              <div className="h-2 w-2 rounded-full bg-white" />
              Stop Recording
            </button>
          </>
        )}
        {videoBlob && !isRecordingVideo && (
          <>
            <button
              onClick={resetVideoRecording}
              className="flex items-center gap-2 rounded-lg border border-border/50 bg-background px-4 py-2 text-foreground transition-colors hover:bg-muted"
            >
              <X className="h-4 w-4" />
              Re-record
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-electric px-6 py-3 text-white transition-all hover:bg-electric-glow disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Post Video
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
