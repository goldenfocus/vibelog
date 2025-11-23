/**
 * useAutoScroll Hook
 * Automatically scroll container to bottom when content changes
 * Useful for chat interfaces, transcriptions, etc.
 */

import { useRef, useEffect, useCallback } from 'react';

export interface AutoScrollOptions {
  /**
   * Enable smooth scrolling
   * @default true
   */
  smooth?: boolean;

  /**
   * Only auto-scroll if user is near bottom (within threshold)
   * Prevents auto-scroll if user scrolled up
   * @default true
   */
  onlyWhenNearBottom?: boolean;

  /**
   * Threshold in pixels to consider "near bottom"
   * @default 100
   */
  nearBottomThreshold?: number;

  /**
   * Dependencies that trigger scroll
   */
  dependencies?: unknown[];
}

/**
 * Auto-scroll container to bottom when content changes
 * Returns containerRef and manual scrollToBottom function
 *
 * @example
 * const { containerRef, scrollToBottom } = useAutoScroll({
 *   dependencies: [messages], // Scroll when messages update
 * });
 *
 * <div ref={containerRef} className="overflow-y-auto">
 *   {messages.map(msg => <div key={msg.id}>{msg.text}</div>)}
 * </div>
 */
export function useAutoScroll<T extends HTMLElement = HTMLDivElement>(
  options: AutoScrollOptions = {}
) {
  const {
    smooth = true,
    onlyWhenNearBottom = true,
    nearBottomThreshold = 100,
    dependencies = [],
  } = options;

  const containerRef = useRef<T>(null);

  /**
   * Check if container is scrolled near bottom
   */
  const isNearBottom = useCallback((): boolean => {
    const container = containerRef.current;
    if (!container) {
      return false;
    }

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    return distanceFromBottom <= nearBottomThreshold;
  }, [nearBottomThreshold]);

  /**
   * Scroll to bottom of container
   */
  const scrollToBottom = useCallback(
    (force: boolean = false) => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      // Only scroll if forced or user is near bottom
      if (force || !onlyWhenNearBottom || isNearBottom()) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: smooth ? 'smooth' : 'auto',
        });
      }
    },
    [smooth, onlyWhenNearBottom, isNearBottom]
  );

  /**
   * Auto-scroll when dependencies change
   */
  useEffect(() => {
    if (dependencies.length > 0) {
      // Small delay to ensure DOM has updated
      const timer = setTimeout(() => {
        scrollToBottom();
      }, 10);

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return {
    containerRef,
    scrollToBottom,
    isNearBottom,
  };
}

/**
 * Simpler hook that always scrolls to bottom on content change
 * No "near bottom" checking - always scrolls
 *
 * @example
 * const containerRef = useAlwaysScrollToBottom([messages]);
 * <div ref={containerRef}>{content}</div>
 */
export function useAlwaysScrollToBottom<T extends HTMLElement = HTMLDivElement>(
  dependencies: unknown[] = []
) {
  const { containerRef } = useAutoScroll<T>({
    smooth: true,
    onlyWhenNearBottom: false,
    dependencies,
  });

  return containerRef;
}

/**
 * Hook to scroll element into view when mounted
 * Useful for highlighting new messages, etc.
 *
 * @example
 * const ref = useScrollIntoView(shouldScroll);
 * <div ref={ref}>New message!</div>
 */
export function useScrollIntoView<T extends HTMLElement = HTMLDivElement>(
  shouldScroll: boolean = true,
  options: ScrollIntoViewOptions = {
    behavior: 'smooth',
    block: 'nearest',
  }
) {
  const elementRef = useRef<T>(null);

  useEffect(() => {
    if (shouldScroll && elementRef.current) {
      elementRef.current.scrollIntoView(options);
    }
  }, [shouldScroll, options]);

  return elementRef;
}
