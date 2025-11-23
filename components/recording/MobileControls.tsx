'use client';

import { X, Pause, Play, Check, RotateCcw } from 'lucide-react';

import { ActionBar, ActionBarAction } from '@/components/mobile/ActionBar';

export interface MobileControlsProps {
  /**
   * Recording state
   */
  state: 'idle' | 'recording' | 'paused' | 'processing';

  /**
   * Callback when cancel is clicked
   */
  onCancel: () => void;

  /**
   * Callback when pause/resume is clicked
   */
  onPauseResume: () => void;

  /**
   * Callback when done/stop is clicked
   */
  onDone: () => void;

  /**
   * Callback when retry is clicked (only shown in paused state)
   */
  onRetry?: () => void;

  /**
   * Disable all controls
   */
  disabled?: boolean;

  /**
   * Show confirmation before cancel
   * @default true
   */
  confirmCancel?: boolean;

  /**
   * Custom className
   */
  className?: string;
}

/**
 * Mobile recording controls
 * Bottom action bar with Cancel, Pause/Resume, Done buttons
 * Optimized for thumb reach and touch interaction
 *
 * @example
 * <MobileControls
 *   state="recording"
 *   onCancel={handleCancel}
 *   onPauseResume={handlePause}
 *   onDone={handleDone}
 * />
 */
export function MobileControls({
  state,
  onCancel,
  onPauseResume,
  onDone,
  onRetry,
  disabled = false,
  confirmCancel = true,
  className,
}: MobileControlsProps) {
  const handleCancel = () => {
    if (confirmCancel && state === 'recording') {
      // Show confirmation
      // eslint-disable-next-line no-alert
      const confirmed = window.confirm(
        'Are you sure you want to cancel this recording? Your progress will be lost.'
      );
      if (!confirmed) {
        return;
      }
    }
    onCancel();
  };

  // Build actions based on state
  const actions: ActionBarAction[] = [];

  // Cancel button (always show except when processing)
  if (state !== 'processing') {
    actions.push({
      id: 'cancel',
      icon: X,
      label: 'Cancel',
      onClick: handleCancel,
      variant: 'destructive',
      disabled,
    });
  }

  // Pause/Resume button (only when recording or paused)
  if (state === 'recording' || state === 'paused') {
    actions.push({
      id: 'pause-resume',
      icon: state === 'recording' ? Pause : Play,
      label: state === 'recording' ? 'Pause' : 'Resume',
      onClick: onPauseResume,
      variant: 'default',
      disabled,
    });
  }

  // Retry button (only when paused and callback provided)
  if (state === 'paused' && onRetry) {
    actions.push({
      id: 'retry',
      icon: RotateCcw,
      label: 'Retry',
      onClick: onRetry,
      variant: 'default',
      disabled,
    });
  }

  // Done button (show when recording, paused, or processing)
  if (state !== 'idle') {
    actions.push({
      id: 'done',
      icon: Check,
      label: state === 'processing' ? 'Processing...' : 'Done',
      onClick: onDone,
      variant: 'primary',
      disabled: disabled || state === 'processing',
      loading: state === 'processing',
    });
  }

  return (
    <ActionBar
      actions={actions}
      layout="horizontal"
      hapticFeedback={!disabled}
      className={className}
    />
  );
}
