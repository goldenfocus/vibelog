import { useEffect, useRef, RefObject } from 'react';

interface ScrollPhysicsOptions {
  friction?: number;
  snapForce?: number;
  cardWidth?: number;
  gap?: number;
  enabled?: boolean;
}

/**
 * Custom hook for physics-based momentum scrolling with snap-to-card behavior
 * Creates smooth, natural-feeling scroll animations with elastic snap
 */
export function useScrollPhysics(
  containerRef: RefObject<HTMLDivElement>,
  options: ScrollPhysicsOptions = {}
) {
  const {
    friction = 0.95,
    snapForce = 0.15,
    cardWidth = 320,
    gap = 20,
    enabled = true,
  } = options;

  const velocityRef = useRef(0);
  const lastScrollRef = useRef(0);
  const rafRef = useRef<number>();
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;
    const totalCardWidth = cardWidth + gap;

    const applyMomentum = () => {
      if (!container) return;

      // Apply friction to velocity
      velocityRef.current *= friction;

      // Calculate snap target
      const currentScroll = container.scrollLeft;
      const nearestCard = Math.round(currentScroll / totalCardWidth);
      const snapTarget = nearestCard * totalCardWidth;
      const snapOffset = (snapTarget - currentScroll) * snapForce;

      // Continue if there's significant velocity or snap offset
      if (Math.abs(velocityRef.current) > 0.5) {
        container.scrollLeft += velocityRef.current;
        rafRef.current = requestAnimationFrame(applyMomentum);
      } else if (Math.abs(snapOffset) > 0.5) {
        container.scrollLeft += snapOffset;
        rafRef.current = requestAnimationFrame(applyMomentum);
      } else {
        // Snap complete - ensure exact position
        container.scrollLeft = snapTarget;
        isScrollingRef.current = false;
      }
    };

    const handleScroll = () => {
      const currentScroll = container.scrollLeft;

      // Calculate velocity
      velocityRef.current = currentScroll - lastScrollRef.current;
      lastScrollRef.current = currentScroll;

      // Clear any existing scroll timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Start momentum animation if not already running
      if (!isScrollingRef.current) {
        isScrollingRef.current = true;
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }
      }

      // Set timeout to trigger snap after user stops scrolling
      scrollTimeoutRef.current = setTimeout(() => {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }
        rafRef.current = requestAnimationFrame(applyMomentum);
      }, 150);
    };

    // Add scroll listener
    container.addEventListener('scroll', handleScroll, { passive: true });

    // Initialize last scroll position
    lastScrollRef.current = container.scrollLeft;

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [containerRef, enabled, friction, snapForce, cardWidth, gap]);

  // Utility function to scroll to specific card index
  const scrollToCard = (index: number, smooth = true) => {
    if (!containerRef.current) return;

    const totalCardWidth = cardWidth + gap;
    const targetScroll = index * totalCardWidth;

    containerRef.current.scrollTo({
      left: targetScroll,
      behavior: smooth ? 'smooth' : 'auto',
    });
  };

  // Get current active card index
  const getActiveCardIndex = (): number => {
    if (!containerRef.current) return 0;

    const totalCardWidth = cardWidth + gap;
    const currentScroll = containerRef.current.scrollLeft;
    return Math.round(currentScroll / totalCardWidth);
  };

  return {
    scrollToCard,
    getActiveCardIndex,
  };
}
