'use client';

import { Mic, Circle } from 'lucide-react';
import React from 'react';

import { useI18n } from '@/components/providers/I18nProvider';

export type RecordingState = 'idle' | 'recording' | 'processing' | 'complete';

export interface ControlsProps {
  recordingState: RecordingState;
  recordingTime: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onReset: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Main recording controls with microphone button and status display
 * Handles start/stop/reset actions with state-dependent UI
 */
export default function Controls({
  recordingState,
  recordingTime,
  onStartRecording,
  onStopRecording,
  onReset,
  disabled = false,
  className = '',
}: ControlsProps) {
  const { t } = useI18n();

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Free plan: 5 minutes (300 seconds)
  const getTimeLimit = () => {
    // In a real app, this would be based on user's subscription
    return 300; // 5 minutes for free plan
  };

  const isNearTimeLimit = () => {
    const limit = getTimeLimit();
    return recordingTime >= limit - 30; // Warning 30 seconds before limit
  };

  const hasReachedTimeLimit = () => {
    return recordingTime >= getTimeLimit();
  };

  const getMicButtonContent = () => {
    switch (recordingState) {
      case 'idle':
        return <Mic className="h-24 w-24" />;
      case 'recording':
        return <Circle className="h-24 w-24 animate-pulse fill-current text-red-500" />;
      case 'processing':
        return (
          <div className="h-24 w-24 animate-spin rounded-full border-8 border-current border-t-transparent" />
        );
      case 'complete':
        return <Mic className="h-24 w-24" />;
    }
  };

  const getStatusText = () => {
    switch (recordingState) {
      case 'idle':
        return t('recorder.idle');
      case 'recording':
        return t('recorder.recording');
      case 'processing':
        return t('recorder.processing');
      case 'complete':
        return t('recorder.done');
    }
  };

  const handleClick = () => {
    if (disabled) {
      return;
    }

    switch (recordingState) {
      case 'recording':
        onStopRecording();
        break;
      case 'complete':
        onReset();
        break;
      case 'idle':
      default:
        onStartRecording();
        break;
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="mb-12 flex flex-col items-center">
        <button
          onClick={handleClick}
          disabled={disabled || recordingState === 'processing'}
          className={[
            'mic',
            recordingState === 'recording' ? 'is-recording' : '',
            'h-40 w-40 rounded-full sm:h-48 sm:w-48',
            'bg-gradient-electric text-primary-foreground',
            'transition-electric flex items-center justify-center',
            'hover:shadow-[0_20px_40px_rgba(97,144,255,0.3)]',
            'disabled:cursor-not-allowed disabled:opacity-70',
            recordingState === 'complete'
              ? '!bg-secondary !text-secondary-foreground shadow-elevated'
              : '',
          ].join(' ')}
          data-testid={`mic-button-${recordingState}`}
          aria-label={getStatusText()}
        >
          {getMicButtonContent()}
        </button>

        <div className="mt-6 text-center">
          <p className="mb-2 text-lg text-muted-foreground">{getStatusText()}</p>
          {recordingState === 'recording' && (
            <div className="flex flex-col items-center space-y-2">
              <div
                className={`font-mono text-2xl font-bold transition-colors ${
                  isNearTimeLimit() ? 'text-red-500' : 'text-foreground'
                }`}
                data-testid="recording-timer"
              >
                {formatTime(recordingTime)}
              </div>
              <div className="text-sm text-muted-foreground">
                {t('components.micRecorder.freePlanLimit', {
                  timeLimit: formatTime(getTimeLimit()),
                })}
                {isNearTimeLimit() && !hasReachedTimeLimit() && (
                  <span className="ml-2 text-red-500" data-testid="time-warning">
                    ⚠️{' '}
                    {t('components.micRecorder.timeRemaining', {
                      seconds: Math.floor(getTimeLimit() - recordingTime),
                    })}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
