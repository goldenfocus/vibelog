'use client';

import { Loader2, Mic, Square } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { RecordingState } from '@/components/mic/Controls';
import { Button } from '@/components/ui/button';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { cn } from '@/lib/utils';

export interface VoiceInputProps {
  disabled?: boolean;
  className?: string;
  onTranscript?: (transcript: string) => void | Promise<void>;
  onRecordingStateChange?: (state: RecordingState) => void;
}

/**
 * Lightweight microphone input that leans on the existing speech recognition hook.
 * Displays recording feedback, handles permission errors, and emits the final transcript.
 */
export function VoiceInput({
  disabled = false,
  className,
  onTranscript,
  onRecordingStateChange,
}: VoiceInputProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { liveTranscript, isSupported, resetTranscript } = useSpeechRecognition(recordingState);
  const liveTranscriptRef = useRef('');

  useEffect(() => {
    liveTranscriptRef.current = liveTranscript;
  }, [liveTranscript]);

  useEffect(() => {
    onRecordingStateChange?.(recordingState);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [recordingState, onRecordingStateChange]);

  const statusLabel = useMemo(() => {
    switch (recordingState) {
      case 'recording':
        return 'Listening…';
      case 'processing':
        return 'Processing voice input…';
      case 'complete':
        return lastTranscript ? 'Voice input captured' : 'No speech detected';
      default:
        return 'Hold to speak or tap to start recording';
    }
  }, [recordingState, lastTranscript]);

  const startRecording = useCallback(async () => {
    if (disabled || recordingState === 'recording') {
      return;
    }

    setPermissionError(null);
    setLastTranscript('');

    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (error) {
        console.warn('Microphone permission denied', error);
        setPermissionError('Microphone access denied. Check your browser permissions.');
        return;
      }
    }

    setRecordingState('recording');
  }, [disabled, recordingState]);

  const stopRecording = useCallback(async () => {
    if (recordingState !== 'recording') {
      return;
    }

    setRecordingState('processing');
    const transcript = liveTranscriptRef.current.trim();
    setLastTranscript(transcript);

    try {
      if (transcript) {
        await onTranscript?.(transcript);
      }
    } catch (error) {
      console.error('Failed to deliver transcript', error);
      setPermissionError('Could not send transcript. Please try again.');
    } finally {
      resetTranscript();

      timeoutRef.current = setTimeout(() => {
        setRecordingState(transcript ? 'complete' : 'idle');

        // Allow the completion message to show briefly before returning to idle
        if (transcript) {
          timeoutRef.current = setTimeout(() => {
            setRecordingState('idle');
          }, 1500);
        }
      }, 250);
    }
  }, [onTranscript, recordingState, resetTranscript]);

  const toggleRecording = async () => {
    if (recordingState === 'recording') {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div
        className={cn(
          'flex items-center justify-between rounded-2xl border border-border/30 bg-card px-4 py-3 shadow-sm sm:px-6',
          recordingState === 'recording' ? 'ring-2 ring-primary/60 ring-offset-2' : ''
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground" data-testid="voice-status">
            {statusLabel}
          </p>
          {permissionError ? (
            <p className="mt-1 text-xs text-destructive">{permissionError}</p>
          ) : (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {recordingState === 'recording' && liveTranscript
                ? liveTranscript
                : recordingState === 'complete' && lastTranscript
                  ? lastTranscript
                  : 'Your speech will be converted into a prompt for the AI.'}
            </p>
          )}
          {!isSupported && (
            <p className="mt-2 text-xs text-amber-500">
              Browser speech recognition not available. Transcript preview disabled.
            </p>
          )}
        </div>

        <Button
          type="button"
          size="icon"
          variant={recordingState === 'recording' ? 'destructive' : 'secondary'}
          className={cn(
            'ml-4 shrink-0 rounded-full',
            recordingState === 'recording' ? 'animate-pulse shadow-lg' : ''
          )}
          disabled={disabled}
          onClick={toggleRecording}
          data-testid="voice-toggle"
          aria-pressed={recordingState === 'recording'}
          aria-label={
            recordingState === 'recording' ? 'Stop recording voice input' : 'Start voice input'
          }
        >
          {recordingState === 'recording' && <Square className="h-5 w-5" />}
          {recordingState === 'processing' && <Loader2 className="h-5 w-5 animate-spin" />}
          {(recordingState === 'idle' || recordingState === 'complete') && (
            <Mic className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
}

export default VoiceInput;
