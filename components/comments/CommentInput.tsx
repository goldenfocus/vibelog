'use client';

import { MessageSquare, Mic, Send, Edit3, X } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

import { AudioEngine } from '@/components/mic/AudioEngine';
import Controls from '@/components/mic/Controls';
import Waveform from '@/components/mic/Waveform';
import { useAuth } from '@/components/providers/AuthProvider';

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
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [textContent, setTextContent] = useState('');
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [levels, setLevels] = useState<number[]>(Array.from({ length: 15 }, () => 0.1));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transcript, setTranscript] = useState('');

  const audioEngineRef = useRef<AudioEngine | null>(null);
  const recordingTimerRef = useRef<number | null>(null);

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

  const resetRecording = () => {
    setRecordingState('idle');
    setRecordingTime(0);
    setAudioBlob(null);
    setTranscript('');
    setLevels(Array.from({ length: 15 }, () => 0.1));
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
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to submit comment');
        }

        toast.success('Your vibe comment is live! 🔥');
        setTextContent('');
        onCommentAdded();
      } else {
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
          }),
        });

        if (!commentResponse.ok) {
          const error = await commentResponse.json();
          throw new Error(error.error || 'Failed to submit comment');
        }

        toast.success('Your voice vibe is live! 🎤✨');
        resetRecording();
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

          {/* Review & Edit Transcript */}
          {recordingState === 'reviewing' && transcript && (
            <div className="space-y-4 rounded-lg border-2 border-electric/20 bg-card/50 p-4">
              <div className="flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-electric" />
                <h4 className="text-sm font-semibold">Review & Edit</h4>
              </div>

              <textarea
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
                placeholder="Edit your transcription..."
                className="w-full resize-none rounded-lg border border-border/30 bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-electric focus:outline-none"
                rows={4}
              />

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
    </div>
  );
}
