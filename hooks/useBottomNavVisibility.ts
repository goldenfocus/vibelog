/**
 * useBottomNavVisibility Hook
 * Auto-hide/show bottom navigation based on scroll direction
 * Hide on scroll down, show on scroll up (like mobile apps)
 */

import { useEffect, useState, useRef } from 'react';

export interface BottomNavVisibilityOptions {
  /**
   * Minimum scroll distance before hiding (pixels)
   * @default 10
   */
  threshold?: number;

  /**
   * Scroll container selector (default: window)
   */
  container?: HTMLElement | null;
}

/**
 * Auto-hide bottom navigation on scroll down, show on scroll up
 * Returns visibility state and manual control functions
 *
 * @example
 * const { isVisible } = useBottomNavVisibility();
 * <BottomNav className={isVisible ? 'translate-y-0' : 'translate-y-full'} />
 */
export function useBottomNavVisibility(options: BottomNavVisibilityOptions = {}): {
  isVisible: boolean;
  show: () => void;
  hide: () => void;
} {
  const { threshold = 10, container } = options;

  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const scrollContainer = container || window;

    const getScrollY = (): number => {
      if (scrollContainer === window) {
        return window.scrollY || window.pageYOffset;
      }
      return (scrollContainer as HTMLElement).scrollTop;
    };

    const updateVisibility = () => {
      const currentScrollY = getScrollY();
      const scrollDiff = currentScrollY - lastScrollY.current;

      // Only update if scrolled past threshold
      if (Math.abs(scrollDiff) > threshold) {
        // Scrolling down - hide nav
        if (scrollDiff > 0 && currentScrollY > 100) {
          setIsVisible(false);
        }
        // Scrolling up - show nav
        else if (scrollDiff < 0) {
          setIsVisible(true);
        }

        lastScrollY.current = currentScrollY;
      }

      ticking.current = false;
    };

    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(updateVisibility);
        ticking.current = true;
      }
    };

    // Initialize
    lastScrollY.current = getScrollY();

    // Listen to scroll
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [threshold, container]);

  const show = () => setIsVisible(true);
  const hide = () => setIsVisible(false);

  return { isVisible, show, hide };
}
