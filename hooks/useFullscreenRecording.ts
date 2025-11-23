/**
 * useFullscreenRecording Hook
 * Manages fullscreen state for immersive recording experience
 * Locks scroll, hides navigation, and handles escape routes
 */

import { useEffect, useState, useCallback } from 'react';

import { useAutoOrientationLock } from './useOrientationLock';

export interface FullscreenRecordingOptions {
  /**
   * Lock orientation when entering fullscreen
   * @default 'portrait'
   */
  orientation?: 'portrait' | 'landscape' | 'any';

  /**
   * Prevent accidental exits (require confirmation)
   * @default true
   */
  preventAccidentalExit?: boolean;

  /**
   * Callback when user tries to exit fullscreen
   */
  onExitAttempt?: () => void;

  /**
   * Callback when fullscreen is entered
   */
  onEnter?: () => void;

  /**
   * Callback when fullscreen is exited
   */
  onExit?: () => void;
}

/**
 * Fullscreen recording state management
 * Returns controls for entering/exiting immersive recording mode
 *
 * @example
 * const { isFullscreen, enter, exit } = useFullscreenRecording({
 *   orientation: 'portrait',
 *   onEnter: () => console.log('Recording started'),
 *   onExit: () => console.log('Recording stopped'),
 * });
 */
export function useFullscreenRecording(options: FullscreenRecordingOptions = {}) {
  const {
    orientation = 'portrait',
    preventAccidentalExit = true,
    onExitAttempt,
    onEnter,
    onExit,
  } = options;

  const [isFullscreen, setIsFullscreen] = useState(false);

  // Lock orientation when in fullscreen
  useAutoOrientationLock(isFullscreen, orientation);

  // Enter fullscreen mode
  const enter = useCallback(() => {
    setIsFullscreen(true);
    onEnter?.();
  }, [onEnter]);

  // Exit fullscreen mode
  const exit = useCallback(() => {
    if (preventAccidentalExit && onExitAttempt) {
      // Let the parent component handle confirmation
      onExitAttempt();
    } else {
      setIsFullscreen(false);
      onExit?.();
    }
  }, [preventAccidentalExit, onExitAttempt, onExit]);

  // Force exit (bypass confirmation)
  const forceExit = useCallback(() => {
    setIsFullscreen(false);
    onExit?.();
  }, [onExit]);

  // Lock body scroll when in fullscreen
  useEffect(() => {
    if (!isFullscreen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;

    // Lock scroll
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';

    return () => {
      // Restore scroll
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, [isFullscreen]);

  // Handle Escape key
  useEffect(() => {
    if (!isFullscreen) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        exit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, exit]);

  // Handle Android back button (if available)
  useEffect(() => {
    if (!isFullscreen) {
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      exit();
    };

    // Push a state to capture back button
    window.history.pushState({ fullscreen: true }, '');

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);

      // Clean up history state
      if (window.history.state?.fullscreen) {
        window.history.back();
      }
    };
  }, [isFullscreen, exit]);

  return {
    isFullscreen,
    enter,
    exit,
    forceExit,
  };
}
