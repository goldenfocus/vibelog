/**
 * useSafeArea Hook
 * Provides safe area insets for iOS notch, Android gesture bars, etc.
 */

import { useEffect, useState } from 'react';

export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Get safe area insets from CSS environment variables
 * Returns pixel values for top, bottom, left, right safe areas
 *
 * @example
 * const { top, bottom } = useSafeArea();
 * style={{ paddingTop: top, paddingBottom: bottom }}
 */
export function useSafeArea(): SafeAreaInsets {
  const [insets, setInsets] = useState<SafeAreaInsets>({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const computeInsets = () => {
      // Get computed style from root element
      const style = getComputedStyle(document.documentElement);

      // Parse env() values
      const top = parseFloat(style.getPropertyValue('--safe-area-inset-top') || '0');
      const bottom = parseFloat(style.getPropertyValue('--safe-area-inset-bottom') || '0');
      const left = parseFloat(style.getPropertyValue('--safe-area-inset-left') || '0');
      const right = parseFloat(style.getPropertyValue('--safe-area-inset-right') || '0');

      setInsets({ top, bottom, left, right });
    };

    // Compute on mount
    computeInsets();

    // Recompute on resize (orientation change)
    window.addEventListener('resize', computeInsets);
    return () => window.removeEventListener('resize', computeInsets);
  }, []);

  return insets;
}

/**
 * Get safe area CSS variable strings
 * Returns CSS variables for use in inline styles
 *
 * @example
 * const safeArea = useSafeAreaVars();
 * style={{ paddingBottom: safeArea.bottom }}
 */
export function useSafeAreaVars() {
  return {
    top: `var(--safe-area-inset-top, 0px)`,
    bottom: `var(--safe-area-inset-bottom, 0px)`,
    left: `var(--safe-area-inset-left, 0px)`,
    right: `var(--safe-area-inset-right, 0px)`,
  };
}

/**
 * Hook to check if device has safe area insets (iPhone X+, modern Android)
 * Useful for conditional rendering or styling
 *
 * @example
 * const hasSafeArea = useHasSafeArea();
 * if (hasSafeArea) {
 *   // Apply extra padding
 * }
 */
export function useHasSafeArea(): boolean {
  const { top, bottom } = useSafeArea();
  return top > 0 || bottom > 0;
}
