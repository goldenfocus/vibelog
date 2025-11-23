/**
 * useIsLandscape Hook
 * Detects if device is in landscape orientation
 */

import { useEffect, useState } from 'react';

/**
 * Detects if the viewport is in landscape orientation
 * Returns true if width > height, false otherwise
 *
 * @example
 * const isLandscape = useIsLandscape();
 * return isLandscape ? <LandscapeLayout /> : <PortraitLayout />;
 */
export function useIsLandscape(): boolean {
  const [isLandscape, setIsLandscape] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.innerWidth > window.innerHeight;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    // Listen for orientation changes
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    // Check immediately
    checkOrientation();

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  return isLandscape;
}
