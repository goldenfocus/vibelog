/**
 * useOrientationLock Hook
 * Lock device orientation (portrait/landscape) for immersive experiences
 * Uses Screen Orientation API with graceful degradation
 */

import { useEffect, useState } from 'react';

export type OrientationType =
  | 'portrait'
  | 'portrait-primary'
  | 'portrait-secondary'
  | 'landscape'
  | 'landscape-primary'
  | 'landscape-secondary'
  | 'any'
  | 'natural';

/**
 * Get current device orientation
 */
export function useOrientation(): OrientationType {
  const [orientation, setOrientation] = useState<OrientationType>(() => {
    if (typeof window === 'undefined') {
      return 'portrait';
    }

    // Check Screen Orientation API
    if (screen.orientation) {
      return screen.orientation.type as OrientationType;
    }

    // Fallback to window dimensions
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleOrientationChange = () => {
      if (screen.orientation) {
        setOrientation(screen.orientation.type as OrientationType);
      } else {
        setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
      }
    };

    // Listen to orientation changes
    if (screen.orientation) {
      screen.orientation.addEventListener('change', handleOrientationChange);
    } else {
      window.addEventListener('orientationchange', handleOrientationChange);
      window.addEventListener('resize', handleOrientationChange);
    }

    return () => {
      if (screen.orientation) {
        screen.orientation.removeEventListener('change', handleOrientationChange);
      } else {
        window.removeEventListener('orientationchange', handleOrientationChange);
        window.removeEventListener('resize', handleOrientationChange);
      }
    };
  }, []);

  return orientation;
}

/**
 * Lock device orientation
 * Returns lock/unlock functions and support status
 *
 * @example
 * const { lock, unlock, isSupported } = useOrientationLock();
 *
 * // Lock to landscape when recording
 * useEffect(() => {
 *   if (isRecording) {
 *     lock('landscape');
 *   } else {
 *     unlock();
 *   }
 * }, [isRecording]);
 */
export function useOrientationLock() {
  const [isLocked, setIsLocked] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if Screen Orientation API is supported
    if (typeof window !== 'undefined' && screen.orientation && 'lock' in screen.orientation) {
      setIsSupported(true);
    }
  }, []);

  const lock = async (orientation: OrientationType): Promise<boolean> => {
    if (!isSupported) {
      console.debug('Screen Orientation API not supported');
      return false;
    }

    try {
      // @ts-expect-error - Screen Orientation API not fully typed in TypeScript
      await screen.orientation.lock(orientation);
      setIsLocked(true);
      return true;
    } catch (error) {
      // Common errors:
      // - DOMException: Device doesn't support locking
      // - DOMException: Fullscreen required for locking
      console.debug('Failed to lock orientation:', error);
      return false;
    }
  };

  const unlock = () => {
    if (!isSupported) {
      return;
    }

    try {
      screen.orientation.unlock();
      setIsLocked(false);
    } catch (error) {
      console.debug('Failed to unlock orientation:', error);
    }
  };

  return {
    lock,
    unlock,
    isLocked,
    isSupported,
  };
}

/**
 * Auto-lock orientation based on condition
 * Automatically unlocks on unmount
 *
 * @example
 * // Lock to landscape while recording
 * useAutoOrientationLock(isRecording, 'landscape');
 */
export function useAutoOrientationLock(
  shouldLock: boolean,
  orientation: OrientationType = 'portrait'
) {
  const { lock, unlock } = useOrientationLock();

  useEffect(() => {
    if (shouldLock) {
      lock(orientation);
    } else {
      unlock();
    }

    // Always unlock on unmount
    return () => unlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldLock, orientation]);
}

/**
 * Check if device is in landscape mode
 */
export function useIsLandscape(): boolean {
  const orientation = useOrientation();
  return orientation.startsWith('landscape');
}

/**
 * Check if device is in portrait mode
 */
export function useIsPortrait(): boolean {
  const orientation = useOrientation();
  return orientation.startsWith('portrait');
}
