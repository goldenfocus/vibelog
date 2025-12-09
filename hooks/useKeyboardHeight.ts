/**
 * useKeyboardHeight Hook
 * Detects mobile keyboard presence and height using the Visual Viewport API.
 * Essential for creating WhatsApp/iMessage-level mobile messaging UX.
 */

import { useCallback, useEffect, useState } from 'react';

import { KEYBOARD } from '@/lib/mobile/constants';

export interface KeyboardState {
  /** Whether the keyboard is currently open */
  isKeyboardOpen: boolean;
  /** Height of the keyboard in pixels (0 when closed) */
  keyboardHeight: number;
  /** Current visual viewport height */
  visualViewportHeight: number;
}

/**
 * Detect mobile keyboard presence and height using Visual Viewport API.
 * Falls back gracefully on browsers without support.
 *
 * @example
 * const { isKeyboardOpen, keyboardHeight } = useKeyboardHeight();
 *
 * const bottomOffset = isKeyboardOpen
 *   ? keyboardHeight + KEYBOARD.PADDING_ABOVE_KEYBOARD
 *   : safeAreaBottom;
 */
export function useKeyboardHeight(): KeyboardState {
  const [state, setState] = useState<KeyboardState>({
    isKeyboardOpen: false,
    keyboardHeight: 0,
    visualViewportHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  const updateKeyboardState = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const viewport = window.visualViewport;
    if (!viewport) {
      // Fallback for browsers without Visual Viewport API
      return;
    }

    // Calculate keyboard height as difference between window height and visual viewport
    const keyboardHeight = Math.max(0, window.innerHeight - viewport.height);

    // Consider keyboard "open" if height exceeds threshold
    // This avoids false positives from browser chrome changes
    const isKeyboardOpen = keyboardHeight > KEYBOARD.DETECTION_THRESHOLD;

    setState({
      isKeyboardOpen,
      keyboardHeight: isKeyboardOpen ? keyboardHeight : 0,
      visualViewportHeight: viewport.height,
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const viewport = window.visualViewport;
    if (!viewport) {
      return;
    }

    // Initial calculation
    updateKeyboardState();

    // Listen for viewport changes (keyboard open/close, resize)
    viewport.addEventListener('resize', updateKeyboardState);
    viewport.addEventListener('scroll', updateKeyboardState);

    // Also listen for focus events as backup
    const handleFocus = () => {
      // Small delay to let keyboard animate
      setTimeout(updateKeyboardState, 100);
    };

    const handleBlur = () => {
      // Small delay for keyboard to close
      setTimeout(updateKeyboardState, 100);
    };

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleBlur);

    return () => {
      viewport.removeEventListener('resize', updateKeyboardState);
      viewport.removeEventListener('scroll', updateKeyboardState);
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleBlur);
    };
  }, [updateKeyboardState]);

  return state;
}

/**
 * Check if the device supports Visual Viewport API
 * Useful for conditional rendering or fallback behavior
 */
export function supportsVisualViewport(): boolean {
  return typeof window !== 'undefined' && !!window.visualViewport;
}
