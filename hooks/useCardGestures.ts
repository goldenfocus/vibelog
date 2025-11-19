import { useEffect, useRef, useState, RefObject } from 'react';

export type GestureType =
  | 'tap'
  | 'double-tap'
  | 'long-press'
  | 'swipe-left'
  | 'swipe-right'
  | 'swipe-up'
  | 'swipe-down'
  | null;

interface GestureCallbacks {
  onTap?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

/**
 * Custom hook for detecting touch gestures on cards
 * Supports tap, double-tap, long-press, and swipe gestures
 */
export function useCardGestures(
  elementRef: RefObject<HTMLElement>,
  callbacks: GestureCallbacks = {}
): GestureType {
  const [gesture, setGesture] = useState<GestureType>(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const startTimeRef = useRef(0);
  const lastTapRef = useRef(0);
  const longPressTimerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      startPosRef.current = { x: touch.clientX, y: touch.clientY };
      startTimeRef.current = Date.now();

      // Start long-press timer
      longPressTimerRef.current = setTimeout(() => {
        setGesture('long-press');
        callbacks.onLongPress?.();
      }, 500);
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Cancel long-press if user moves finger
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = undefined;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      // Clear long-press timer
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = undefined;
      }

      const touch = e.changedTouches[0];
      const endX = touch.clientX;
      const endY = touch.clientY;
      const duration = Date.now() - startTimeRef.current;

      const deltaX = endX - startPosRef.current.x;
      const deltaY = endY - startPosRef.current.y;

      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      // Check if it's a swipe (moved more than 50px)
      if (absDeltaX > 50 || absDeltaY > 50) {
        if (absDeltaX > absDeltaY) {
          // Horizontal swipe
          const swipeGesture = deltaX > 0 ? 'swipe-right' : 'swipe-left';
          setGesture(swipeGesture);
          if (swipeGesture === 'swipe-left') callbacks.onSwipeLeft?.();
          else callbacks.onSwipeRight?.();
        } else {
          // Vertical swipe
          const swipeGesture = deltaY > 0 ? 'swipe-down' : 'swipe-up';
          setGesture(swipeGesture);
          if (swipeGesture === 'swipe-up') callbacks.onSwipeUp?.();
          else callbacks.onSwipeDown?.();
        }
        return;
      }

      // Check if it's a tap (short duration, minimal movement)
      if (duration < 300 && absDeltaX < 10 && absDeltaY < 10) {
        const now = Date.now();
        const timeSinceLastTap = now - lastTapRef.current;

        // Double tap detection (within 300ms)
        if (timeSinceLastTap < 300) {
          setGesture('double-tap');
          callbacks.onDoubleTap?.();
          lastTapRef.current = 0; // Reset to prevent triple-tap
        } else {
          setGesture('tap');
          callbacks.onTap?.();
          lastTapRef.current = now;
        }
      }
    };

    // Add event listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, [elementRef, callbacks]);

  // Clear gesture after a short delay
  useEffect(() => {
    if (gesture) {
      const timer = setTimeout(() => setGesture(null), 100);
      return () => clearTimeout(timer);
    }
  }, [gesture]);

  return gesture;
}
