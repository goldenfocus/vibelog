'use client';

import { MessageSquare, Mic, Send } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';

import { AudioEngine } from '@/components/mic/AudioEngine';
import Controls from '@/components/mic/Controls';
import Waveform from '@/components/mic/Waveform';
import { useAuth } from '@/components/providers/AuthProvider';

type RecordingState = 'idle' | 'recording' | 'processing' | 'complete';

interface CommentInputProps {
  vibelogId: string;
  onCommentAdded: () => void;
}

export default function CommentInput({ vibelogId, onCommentAdded }: CommentInputProps) {
  const { user } = useAuth();
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [textContent, setTextContent] = useState('');
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [levels, setLevels] = useState<number[]>(Array.from({ length: 15 }, () => 0.1));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const audioEngineRef = useRef<AudioEngine | null>(null);
  const recordingTimerRef = useRef<number | null>(null);

  // Initialize audio engine
  useEffect(() => {
    audioEngineRef.current = new AudioEngine({
      onLevelsUpdate: setLevels,
      onDataAvailable: (blob, duration) => {
        setAudioBlob(blob);
        setRecordingState('complete');
        console.log('Recording complete:', blob.size, 'bytes,', duration, 'seconds');
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
  }, []);

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

        toast.success('Comment posted!');
        setTextContent('');
        onCommentAdded();
      } else {
        // Submit voice comment - first upload audio, then create comment
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

        // Create comment with audio URL
        const commentResponse = await fetch('/api/comments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            vibelogId,
            audioUrl,
          }),
        });

        if (!commentResponse.ok) {
          const error = await commentResponse.json();
          throw new Error(error.error || 'Failed to submit comment');
        }

        toast.success('Voice comment posted!');
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
          <Controls
            recordingState={recordingState}
            recordingTime={recordingTime}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            onReset={resetRecording}
            disabled={isSubmitting}
          />

          {/* Waveform */}
          {recordingState === 'recording' && (
            <Waveform levels={levels} isActive={true} variant="recording" />
          )}

          {/* Submit Button */}
          {recordingState === 'complete' && audioBlob && (
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
