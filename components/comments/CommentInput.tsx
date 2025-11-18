'use client';

import { MessageSquare, Mic, Send, Edit3, X, Sparkles, Video } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

import MediaAttachmentZone from '@/components/comments/MediaAttachmentZone';
import { AudioEngine } from '@/components/mic/AudioEngine';
import Controls from '@/components/mic/Controls';
import Waveform from '@/components/mic/Waveform';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToneSettings } from '@/hooks/useToneSettings';
import type { WritingTone } from '@/hooks/useToneSettings';
import { createClient } from '@/lib/supabase';
import type { MediaAttachment } from '@/types/comments';

type RecordingState =
  | 'idle'
  | 'recording'
  | 'processing'
  | 'complete'
  | 'transcribing'
  | 'reviewing';

interface CommentInputProps {
  vibelogId: string;
  onCommentAdded: () => void;
}

export default function CommentInput({ vibelogId, onCommentAdded }: CommentInputProps) {
  const { user, loading: authLoading } = useAuth();
  const { tone, setTone } = useToneSettings();
  const [inputMode, setInputMode] = useState<'text' | 'voice' | 'video'>('text');
  const [textContent, setTextContent] = useState('');
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [levels, setLevels] = useState<number[]>(Array.from({ length: 15 }, () => 0.1));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [originalTranscript, setOriginalTranscript] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const [showCustomInstructions, setShowCustomInstructions] = useState(false);
  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);

  const audioEngineRef = useRef<AudioEngine | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Create and cleanup blob URL for video preview
  useEffect(() => {
    if (videoBlob) {
      const url = URL.createObjectURL(videoBlob);
      setVideoBlobUrl(url);
      console.log('Created blob URL for video preview:', url);

      return () => {
        URL.revokeObjectURL(url);
        console.log('Revoked blob URL:', url);
      };
    } else {
      setVideoBlobUrl(null);
    }
  }, [videoBlob]);

  const transcribeAudio = useCallback(async (blob: Blob) => {
    try {
      setRecordingState('transcribing');

      const formData = new FormData();
      formData.append('audio', blob, 'comment.webm');

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to transcribe audio');
      }

      const { transcription } = await response.json();
      console.log('✅ Transcription received:', transcription);

      if (!transcription || transcription.trim() === '') {
        throw new Error('Transcription is empty. Please try recording again with clearer audio.');
      }

      setTranscript(transcription);
      setOriginalTranscript(transcription); // Save original for comparison
      setRecordingState('reviewing');
      toast.success('Transcription ready! Review and edit before posting.');
    } catch (error) {
      console.error('❌ Transcription error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to transcribe audio';
      toast.error(`${errorMessage}. You can still post the audio without a transcript.`);

      // Fall back to allowing direct posting without transcript
      // Set an empty transcript but stay in processing state so they can post audio
      setTranscript('');
      setRecordingState('processing');
    }
  }, []);

  // Initialize audio engine
  useEffect(() => {
    audioEngineRef.current = new AudioEngine({
      onLevelsUpdate: setLevels,
      onDataAvailable: async (blob, duration) => {
        setAudioBlob(blob);
        setRecordingState('transcribing');
        console.log('Recording complete:', blob.size, 'bytes,', duration, 'seconds');

        // Transcribe the audio
        await transcribeAudio(blob);
      },
      onError: error => {
        toast.error(error);
        setRecordingState('idle');
      },
    });

    return () => {
      if (audioEngineRef.current) {
        audioEngineRef.current.cleanup();
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [transcribeAudio]);

  const startRecording = async () => {
    if (!audioEngineRef.current) {
      return;
    }

    const hasPermission = await audioEngineRef.current.requestPermission();
    if (!hasPermission) {
      toast.error('Microphone permission denied');
      return;
    }

    const started = await audioEngineRef.current.startRecording();
    if (started) {
      setRecordingState('recording');
      setRecordingTime(0);
      setAudioBlob(null);

      // Start timer
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (audioEngineRef.current) {
      audioEngineRef.current.stopRecordingAndRelease();
      setRecordingState('processing');
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  // Auto-start camera preview when entering video mode
  useEffect(() => {
    if (inputMode === 'video' && !videoStream && !videoBlob) {
      startCameraPreview();
    }

    return () => {
      // Cleanup camera when leaving video mode
      if (inputMode !== 'video' && videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        setVideoStream(null);
      }
    };
  }, [inputMode]);

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
      toast.error('Failed to access camera. Please check permissions.');
    }
  };

  const startVideoRecording = () => {
    if (!videoStream) {
      toast.error('Camera not ready');
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
        console.log('Video blob created:', blob.size, 'bytes, type:', blob.type);
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
          // Auto-stop at 60 seconds
          if (newTime >= 60) {
            stopVideoRecording();
            toast.info('Maximum recording time reached (60 seconds)');
          }
          return newTime;
        });
      }, 1000);
    } catch (error) {
      console.error('Error starting video recording:', error);
      toast.error('Failed to start recording.');
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
    // Cancel recording without saving
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null; // Prevent blob creation
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    setIsRecordingVideo(false);
    setRecordingTime(0);

    // Restart camera preview
    startCameraPreview();
  };

  const resetVideoRecording = () => {
    // Discard recorded video and restart camera
    setVideoBlob(null);
    setIsRecordingVideo(false);
    setRecordingTime(0);

    // Restart camera preview
    startCameraPreview();
  };

  const handleRegenerateComment = async () => {
    if (!transcript.trim()) {
      toast.error('No transcript to enhance');
      return;
    }

    setIsRegenerating(true);

    try {
      const response = await fetch('/api/comments/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: originalTranscript || transcript, // Use original if available
          tone,
          customInstructions: customInstructions.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to enhance comment');
      }

      const { enhanced_content } = await response.json();
      setTranscript(enhanced_content);
      toast.success(`✨ Comment enhanced with ${tone} tone!`);
    } catch (error) {
      console.error('Error regenerating comment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to enhance comment');
    } finally {
      setIsRegenerating(false);
    }
  };

  const resetRecording = () => {
    setRecordingState('idle');
    setRecordingTime(0);
    setAudioBlob(null);
    setVideoBlob(null);
    setIsRecordingVideo(false);
    setTranscript('');
    setOriginalTranscript('');
    setCustomInstructions('');
    setShowCustomInstructions(false);
    setAttachments([]);
    setLevels(Array.from({ length: 15 }, () => 0.1));

    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please sign in to comment');
      return;
    }

    if (inputMode === 'text' && !textContent.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    if (inputMode === 'voice' && !audioBlob) {
      toast.error('Please record a voice comment');
      return;
    }

    if (inputMode === 'voice' && recordingState === 'reviewing' && !transcript.trim()) {
      toast.error('Please enter a comment or re-record');
      return;
    }

    if (inputMode === 'video' && !videoBlob) {
      toast.error('Please record a video comment');
      return;
    }

    setIsSubmitting(true);

    try {
      if (inputMode === 'text') {
        // Submit text comment
        const response = await fetch('/api/comments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            vibelogId,
            content: textContent.trim(),
            attachments: attachments.length > 0 ? attachments : undefined,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to submit comment');
        }

        toast.success('Your vibe comment is live! 🔥');
        setTextContent('');
        setAttachments([]);
        onCommentAdded();
      } else if (inputMode === 'voice') {
        // Submit voice comment - first upload audio, then create comment with transcript
        // Upload audio file
        const formData = new FormData();
        formData.append('audio', audioBlob, 'comment.webm');
        formData.append('vibelogId', vibelogId);

        // Upload audio to storage
        const uploadResponse = await fetch('/api/storage/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to upload audio');
        }

        const { url: audioUrl } = await uploadResponse.json();

        if (!audioUrl) {
          throw new Error('No audio URL returned from upload');
        }

        // Create comment with audio URL and transcript (if available)
        const commentResponse = await fetch('/api/comments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            vibelogId,
            audioUrl,
            content: transcript.trim() || undefined, // Include edited transcript if available
            attachments: attachments.length > 0 ? attachments : undefined,
          }),
        });

        if (!commentResponse.ok) {
          const error = await commentResponse.json();
          throw new Error(error.error || 'Failed to submit comment');
        }

        toast.success('Your voice vibe is live! 🎤✨');
        resetRecording();
        onCommentAdded();
      } else if (inputMode === 'video' && videoBlob) {
        // Submit video comment - upload directly to Supabase Storage, then create comment
        console.log('Starting video upload process...', {
          blobSize: videoBlob.size,
          blobType: videoBlob.type,
        });

        const supabase = createClient();

        // Get current user
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (!currentUser) {
          throw new Error('You must be logged in to post video comments');
        }

        console.log('User authenticated:', currentUser.id);

        // Generate storage path
        const timestamp = Date.now();
        const randomHash = Math.random().toString(36).substring(2, 10);
        const path = `users/${currentUser.id}/comments/video/${vibelogId}/${timestamp}-${randomHash}.webm`;

        console.log('Uploading to path:', path);

        // Upload directly to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('vibelogs')
          .upload(path, videoBlob, {
            contentType: 'video/webm',
            upsert: true,
          });

        if (uploadError) {
          console.error('Video upload error:', uploadError);
          throw new Error(`Failed to upload video: ${uploadError.message}`);
        }

        console.log('Upload successful:', uploadData);

        // Generate public URL
        const videoUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/vibelogs/${path}`;

        console.log('Generated video URL:', videoUrl);

        // Create comment with video URL
        const commentResponse = await fetch('/api/comments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            vibelogId,
            videoUrl,
          }),
        });

        if (!commentResponse.ok) {
          const error = await commentResponse.json();
          console.error('Comment creation error:', error);
          throw new Error(error.error || 'Failed to submit comment');
        }

        console.log('Video comment created successfully');

        toast.success('Your video vibe is live! 🎥✨');
        resetVideoRecording();
        onCommentAdded();
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="rounded-2xl border border-border/30 bg-card/50 p-6">
        <div className="mb-4 h-10 w-48 animate-pulse rounded-lg bg-muted/60" />
        <div className="space-y-3">
          <div className="h-12 w-full animate-pulse rounded-lg bg-muted/60" />
          <div className="h-10 w-32 animate-pulse rounded-lg bg-muted/60" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-border/30 bg-card/50 p-6 text-center">
        <p className="text-muted-foreground">Sign in to comment</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/30 bg-card/50 p-6">
      {/* Mode Toggle */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => {
            setInputMode('text');
            resetRecording();
          }}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 transition-colors ${
            inputMode === 'text'
              ? 'bg-electric text-white'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          Text
        </button>
        <button
          onClick={() => {
            setInputMode('voice');
            setTextContent('');
          }}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 transition-colors ${
            inputMode === 'voice'
              ? 'bg-electric text-white'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          <Mic className="h-4 w-4" />
          Voice
        </button>
        <button
          onClick={() => {
            setInputMode('video');
            setTextContent('');
            resetRecording();
          }}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 transition-colors ${
            inputMode === 'video'
              ? 'bg-electric text-white'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          <Video className="h-4 w-4" />
          Video
        </button>
      </div>

      {/* Text Input */}
      {inputMode === 'text' && (
        <div className="space-y-4">
          <textarea
            value={textContent}
            onChange={e => setTextContent(e.target.value)}
            placeholder="Write your comment..."
            className="w-full resize-none rounded-lg border border-border/30 bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-electric focus:outline-none"
            rows={3}
          />

          {/* Media Attachments */}
          <MediaAttachmentZone attachments={attachments} onChange={setAttachments} />

          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !textContent.trim()}
              className="flex items-center gap-2 rounded-lg bg-electric px-4 py-2 text-white transition-all hover:bg-electric-glow disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Post Comment
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Voice Input */}
      {inputMode === 'voice' && (
        <div className="space-y-4">
          {/* Recording Controls - Show during idle, recording, processing */}
          {(recordingState === 'idle' ||
            recordingState === 'recording' ||
            recordingState === 'processing') && (
            <Controls
              recordingState={
                recordingState === 'idle' ||
                recordingState === 'recording' ||
                recordingState === 'processing'
                  ? recordingState
                  : 'idle'
              }
              recordingTime={recordingTime}
              onStartRecording={startRecording}
              onStopRecording={stopRecording}
              onReset={resetRecording}
              disabled={isSubmitting}
            />
          )}

          {/* Waveform */}
          {recordingState === 'recording' && (
            <Waveform levels={levels} isActive={true} variant="recording" />
          )}

          {/* Transcribing State */}
          {recordingState === 'transcribing' && (
            <div className="rounded-lg border border-border/30 bg-muted/30 p-8 text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-electric/30 border-t-electric" />
              <p className="text-sm font-medium text-foreground">Transcribing your voice...</p>
              <p className="mt-1 text-xs text-muted-foreground">This will just take a moment</p>
            </div>
          )}

          {/* Review & Edit Transcript with AI Enhancement */}
          {recordingState === 'reviewing' && transcript && (
            <div className="space-y-4 rounded-lg border-2 border-electric/20 bg-card/50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit3 className="h-4 w-4 text-electric" />
                  <h4 className="text-sm font-semibold">Review & Edit</h4>
                </div>
                {originalTranscript && transcript !== originalTranscript && (
                  <button
                    onClick={() => setTranscript(originalTranscript)}
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Restore original
                  </button>
                )}
              </div>

              {/* Tone Selector */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Tone</label>
                <select
                  value={tone}
                  onChange={e => setTone(e.target.value as WritingTone)}
                  className="w-full rounded-lg border border-border/30 bg-background px-3 py-2 text-sm text-foreground transition-colors focus:border-electric focus:outline-none"
                >
                  <option value="authentic">😊 Authentic - Natural & genuine</option>
                  <option value="professional">💼 Professional - Formal & expert</option>
                  <option value="casual">☕ Casual - Friendly & relaxed</option>
                  <option value="humorous">😄 Humorous - Funny & lighthearted</option>
                  <option value="inspiring">🌟 Inspiring - Motivational</option>
                  <option value="analytical">📊 Analytical - Data-driven</option>
                  <option value="storytelling">📖 Storytelling - Narrative focus</option>
                  <option value="dramatic">🎭 Dramatic - Intense & emotional</option>
                  <option value="poetic">✨ Poetic - Literary & artistic</option>
                </select>
              </div>

              {/* Custom Instructions (Optional) */}
              <div className="space-y-2">
                <button
                  onClick={() => setShowCustomInstructions(!showCustomInstructions)}
                  className="text-xs font-medium text-electric transition-opacity hover:opacity-80"
                >
                  {showCustomInstructions ? '− Hide' : '+ Add'} custom instructions
                </button>
                {showCustomInstructions && (
                  <textarea
                    value={customInstructions}
                    onChange={e => setCustomInstructions(e.target.value)}
                    placeholder="e.g., 'Make it more concise' or 'Add an emoji'"
                    className="w-full resize-none rounded-lg border border-border/30 bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-electric focus:outline-none"
                    rows={2}
                  />
                )}
              </div>

              {/* AI Enhance Button */}
              <button
                onClick={handleRegenerateComment}
                disabled={isRegenerating}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-electric/30 bg-electric/5 px-4 py-2.5 text-sm font-semibold text-electric transition-all hover:border-electric/50 hover:bg-electric/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRegenerating ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-electric/30 border-t-electric" />
                    Enhancing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Enhance with AI
                  </>
                )}
              </button>

              {/* Transcript Editor */}
              <textarea
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
                placeholder="Edit your transcription..."
                className="w-full resize-none rounded-lg border border-border/30 bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-electric focus:outline-none"
                rows={4}
              />

              {/* Media Attachments */}
              <MediaAttachmentZone attachments={attachments} onChange={setAttachments} />

              {/* Actions */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  onClick={resetRecording}
                  className="flex items-center gap-2 rounded-lg border border-border/50 bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                  Re-record
                </button>

                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !transcript.trim()}
                  className="flex items-center gap-2 rounded-lg bg-electric px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-electric-glow disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Post Comment
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Legacy: Direct Submit Button for fallback */}
          {recordingState === 'complete' && audioBlob && !transcript && (
            <div className="flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-lg bg-electric px-4 py-2 text-white transition-all hover:bg-electric-glow disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Post Voice Comment
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Video Input */}
      {inputMode === 'video' && (
        <div className="space-y-4">
          {/* Video Preview / Recording */}
          <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border/30 bg-black">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover"
            />
            {isRecordingVideo && (
              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-red-500 px-3 py-1">
                <div className="h-2 w-2 animate-pulse rounded-full bg-white" />
                <span className="text-sm font-medium text-white">
                  {Math.floor(recordingTime / 60)}:
                  {(recordingTime % 60).toString().padStart(2, '0')}
                </span>
              </div>
            )}
            {videoBlobUrl && !isRecordingVideo && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <video
                  key={videoBlobUrl}
                  src={videoBlobUrl}
                  controls
                  playsInline
                  autoPlay
                  className="h-full w-full object-cover"
                />
              </div>
            )}
          </div>

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
      )}
    </div>
  );
}
