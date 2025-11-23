/**
 * Haptic Feedback Engine
 * Provides tactile feedback for mobile interactions with graceful degradation
 */

import { HAPTIC_PATTERNS } from './constants';

type HapticType = keyof typeof HAPTIC_PATTERNS;

/**
 * Check if the Vibration API is supported
 */
export function isHapticSupported(): boolean {
  return typeof window !== 'undefined' && 'vibrate' in navigator;
}

/**
 * Trigger haptic feedback
 * @param type - Predefined haptic pattern (light, medium, heavy, success, etc)
 * @returns true if haptic was triggered, false if not supported
 *
 * @example
 * triggerHaptic('light') // Quick tap feedback
 * triggerHaptic('success') // Success confirmation pattern
 */
export function triggerHaptic(type: HapticType): boolean {
  if (!isHapticSupported()) {
    return false;
  }

  const pattern = HAPTIC_PATTERNS[type];

  try {
    // Pattern can be a single number or array
    // Convert readonly array to mutable array for navigator.vibrate
    if (Array.isArray(pattern)) {
      navigator.vibrate([...pattern] as number[]);
    } else {
      navigator.vibrate(pattern as number);
    }
    return true;
  } catch (error) {
    // Silently fail if vibration is disabled by user
    console.debug('Haptic feedback failed:', error);
    return false;
  }
}

/**
 * Trigger custom haptic pattern
 * @param pattern - Vibration pattern (single duration or array of [vibrate, pause, vibrate...])
 * @returns true if haptic was triggered, false if not supported
 *
 * @example
 * triggerCustomHaptic(50) // 50ms vibration
 * triggerCustomHaptic([100, 50, 100]) // Vibrate, pause, vibrate pattern
 */
export function triggerCustomHaptic(pattern: number | number[]): boolean {
  if (!isHapticSupported()) {
    return false;
  }

  try {
    navigator.vibrate(pattern);
    return true;
  } catch (error) {
    console.debug('Custom haptic feedback failed:', error);
    return false;
  }
}

/**
 * Cancel any ongoing haptic feedback
 */
export function cancelHaptic(): void {
  if (isHapticSupported()) {
    navigator.vibrate(0);
  }
}

/**
 * React hook for haptic feedback
 * Returns a memoized function to trigger haptics
 *
 * @example
 * const haptic = useHaptic();
 * <button onClick={() => haptic('light')}>Tap me</button>
 */
export function useHaptic() {
  // Memoize the function to avoid recreating on every render
  return (type: HapticType) => triggerHaptic(type);
}

/**
 * Higher-order function to add haptic feedback to any callback
 * @param callback - Original callback function
 * @param hapticType - Type of haptic to trigger
 * @returns Wrapped callback with haptic feedback
 *
 * @example
 * const handleClick = withHaptic(() => console.log('Clicked!'), 'light');
 * <button onClick={handleClick}>Click me</button>
 */
export function withHaptic<T extends (...args: never[]) => unknown>(
  callback: T,
  hapticType: HapticType
): T {
  return ((...args: Parameters<T>) => {
    triggerHaptic(hapticType);
    return callback(...args);
  }) as T;
}

/**
 * React hook to add haptic feedback to button/touch handlers
 * @param hapticType - Type of haptic to trigger (default: 'light')
 *
 * @example
 * const buttonProps = useTouchHaptic('medium');
 * <button {...buttonProps} onClick={handleClick}>
 *   Tap me
 * </button>
 */
export function useTouchHaptic(hapticType: HapticType = 'LIGHT') {
  return {
    onTouchStart: () => triggerHaptic(hapticType),
  };
}

/**
 * Utility for continuous haptic feedback during long press
 * @param duration - Duration in milliseconds
 * @param interval - Pulse interval (default: 100ms)
 */
export function triggerContinuousHaptic(duration: number, interval: number = 100): void {
  if (!isHapticSupported()) {
    return;
  }

  const pulses = Math.floor(duration / interval);
  const pattern: number[] = [];

  for (let i = 0; i < pulses; i++) {
    pattern.push(HAPTIC_PATTERNS.LIGHT);
    pattern.push(interval - HAPTIC_PATTERNS.LIGHT);
  }

  navigator.vibrate(pattern);
}
