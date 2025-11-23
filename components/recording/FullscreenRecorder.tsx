'use client';

import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

import { useFullscreenRecording } from '@/hooks/useFullscreenRecording';
import { triggerHaptic } from '@/lib/mobile/haptics';
import { cn } from '@/lib/utils';

import { LandscapeLayout } from './LandscapeLayout';
import { MobileControls } from './MobileControls';
import { MobileTranscription } from './MobileTranscription';
import { MobileWaveform } from './MobileWaveform';
import { PortraitLayout } from './PortraitLayout';

import { useIsLandscape } from '@/hooks/useIsLandscape';

export interface FullscreenRecorderProps {
  /**
   * Is fullscreen mode active
   */
  isActive: boolean;

  /**
   * Recording state
   */
  recordingState: 'idle' | 'recording' | 'paused' | 'processing';

  /**
   * Web Audio API analyzer node
   */
  analyzerNode?: AnalyserNode | null;

  /**
   * Live transcription text
   */
  transcriptionText: string;

  /**
   * Callback when user exits fullscreen
   */
  onExit: () => void;

  /**
   * Callback when user cancels recording
   */
  onCancel: () => void;

  /**
   * Callback when user pauses/resumes
   */
  onPauseResume: () => void;

  /**
   * Callback when user completes recording
   */
  onDone: () => void;

  /**
   * Lock screen orientation
   * @default 'any'
   */
  orientation?: 'portrait' | 'landscape' | 'any';

  /**
   * Prevent accidental exit with confirmation
   * @default true
   */
  preventAccidentalExit?: boolean;

  /**
   * Custom className
   */
  className?: string;
}

/**
 * Fullscreen mobile recording experience
 * Automatically switches between portrait/landscape layouts
 * Handles orientation locking, scroll locking, exit confirmation
 *
 * @example
 * <FullscreenRecorder
 *   isActive={isFullscreen}
 *   recordingState="recording"
 *   analyzerNode={analyzer}
 *   transcriptionText={transcript}
 *   onExit={handleExit}
 *   onCancel={handleCancel}
 *   onPauseResume={handlePause}
 *   onDone={handleDone}
 * />
 */
export function FullscreenRecorder({
  isActive,
  recordingState,
  analyzerNode,
  transcriptionText,
  onExit,
  onCancel,
  onPauseResume,
  onDone,
  orientation = 'any',
  preventAccidentalExit = true,
  className,
}: FullscreenRecorderProps) {
  const isLandscape = useIsLandscape();

  // Handle fullscreen state, orientation lock, scroll lock
  useFullscreenRecording({
    isActive,
    onExit,
    lockOrientation: orientation !== 'any' ? orientation : undefined,
    preventAccidentalExit: preventAccidentalExit && recordingState === 'recording',
  });

  // Don't render if not active or on server
  if (!isActive || typeof window === 'undefined') {
    return null;
  }

  const handleExitClick = () => {
    triggerHaptic('MEDIUM');

    if (preventAccidentalExit && recordingState === 'recording') {
      // eslint-disable-next-line no-alert
      const confirmed = window.confirm(
        'Exit fullscreen mode? Your recording will continue in the background.'
      );
      if (!confirmed) {
        return;
      }
    }

    onExit();
  };

  // Status badge
  const statusBadge = (() => {
    switch (recordingState) {
      case 'recording':
        return (
          <div className="flex items-center gap-2 rounded-full bg-red-500/20 px-3 py-1.5">
            <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="text-xs font-medium text-red-500">REC</span>
          </div>
        );
      case 'paused':
        return (
          <div className="flex items-center gap-2 rounded-full bg-yellow-500/20 px-3 py-1.5">
            <div className="h-2 w-2 rounded-full bg-yellow-500" />
            <span className="text-xs font-medium text-yellow-500">PAUSED</span>
          </div>
        );
      case 'processing':
        return (
          <div className="flex items-center gap-2 rounded-full bg-blue-500/20 px-3 py-1.5">
            <div className="h-2 w-2 animate-spin rounded-full border border-blue-500 border-t-transparent" />
            <span className="text-xs font-medium text-blue-500">PROCESSING</span>
          </div>
        );
      default:
        return null;
    }
  })();

  // Header with status and exit button
  const header = (
    <div className="flex items-center justify-between">
      {statusBadge}
      <button
        onClick={handleExitClick}
        className="touch-manipulation rounded-full p-2 transition-all hover:bg-foreground/10 active:scale-95"
        aria-label="Exit fullscreen"
      >
        <X className="h-6 w-6" />
      </button>
    </div>
  );

  // Waveform component
  const waveform = (
    <MobileWaveform
      analyzerNode={analyzerNode}
      isRecording={recordingState === 'recording'}
      theme="gradient"
      perspective
    />
  );

  // Transcription component
  const transcription = (
    <MobileTranscription
      text={transcriptionText}
      isTranscribing={recordingState === 'recording'}
      animateWords
    />
  );

  // Controls component
  const controls = (
    <MobileControls
      state={recordingState}
      onCancel={onCancel}
      onPauseResume={onPauseResume}
      onDone={onDone}
      confirmCancel={preventAccidentalExit}
    />
  );

  // Choose layout based on orientation
  const Layout = isLandscape ? LandscapeLayout : PortraitLayout;

  // Portal to body for true fullscreen
  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-[9999]',
        'bg-background',
        'touch-none select-none', // Prevent text selection and touch defaults
        className
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Fullscreen recording mode"
    >
      <Layout
        header={header}
        waveform={waveform}
        transcription={transcription}
        controls={controls}
      />
    </div>,
    document.body
  );
}
