'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useRef, useState, useCallback } from 'react';

import { cn } from '@/lib/utils';

import { FloatingCard } from './FloatingCard';
import type { HomeFeedVibelog } from './HomeCommunityShowcase';

interface FuturisticCarouselProps {
  vibelogs: HomeFeedVibelog[];
  title?: string;
  subtitle?: string;
}

/**
 * Futuristic carousel with native CSS snap scrolling
 * Features smooth scroll, snap-to-card, keyboard navigation, and responsive design
 */
export function FuturisticCarousel({ vibelogs, title, subtitle }: FuturisticCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Calculate active card index based on scroll position
  const getActiveCardIndex = useCallback((): number => {
    if (!containerRef.current) {
      return 0;
    }
    const cardWidth = 320;
    const gap = 20;
    const totalCardWidth = cardWidth + gap;
    const currentScroll = containerRef.current.scrollLeft;
    return Math.round(currentScroll / totalCardWidth);
  }, []);

  // Scroll to specific card
  const scrollToCard = useCallback((index: number) => {
    if (!containerRef.current) {
      return;
    }
    const cardWidth = 320;
    const gap = 20;
    const totalCardWidth = cardWidth + gap;
    const targetScroll = index * totalCardWidth;
    containerRef.current.scrollTo({
      left: targetScroll,
      behavior: 'smooth',
    });
  }, []);

  // Update scroll state
  const updateScrollState = useCallback(() => {
    if (!containerRef.current) {
      return;
    }

    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);

    // Update active index
    const newIndex = getActiveCardIndex();
    setActiveIndex(newIndex);
  }, [getActiveCardIndex]);

  // Handle scroll with debouncing
  const handleScroll = useCallback(() => {
    updateScrollState();
  }, [updateScrollState]);

  // Navigation handlers
  const scrollPrev = () => {
    const currentIndex = getActiveCardIndex();
    if (currentIndex > 0) {
      scrollToCard(currentIndex - 1);
    }
  };

  const scrollNext = () => {
    const currentIndex = getActiveCardIndex();
    if (currentIndex < vibelogs.length - 1) {
      scrollToCard(currentIndex + 1);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scrollPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      scrollNext();
    }
  };

  if (!vibelogs || vibelogs.length === 0) {
    return null;
  }

  return (
    <section
      className="relative w-full py-8"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label={title || 'Vibelog carousel'}
    >
      {/* Header */}
      {(title || subtitle) && (
        <div className="mb-6 px-4 md:px-6">
          {title && (
            <h2 className="bg-gradient-electric bg-clip-text text-2xl font-bold text-transparent md:text-3xl">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground md:text-base">{subtitle}</p>
          )}
        </div>
      )}

      {/* Carousel container */}
      <div className="relative">
        {/* Scroll container */}
        <div
          ref={containerRef}
          className={cn(
            'flex gap-5 overflow-x-auto px-4 pb-6 md:px-6',
            'snap-x snap-mandatory scroll-smooth',
            'scrollbar-hide scroll-lock-y', // Hide scrollbar and lock vertical movement
            '-mx-4 md:-mx-6' // Negative margin to allow cards to touch edges
          )}
          onScroll={handleScroll}
          style={{
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorX: 'contain',
            overscrollBehaviorY: 'none',
          }}
        >
          {/* Spacing div for left padding */}
          <div className="w-4 flex-shrink-0 md:w-6" />

          {/* Cards */}
          {vibelogs.map((vibelog, index) => (
            <FloatingCard
              key={vibelog.id}
              vibelog={vibelog}
              index={index}
              isActive={index === activeIndex}
            />
          ))}

          {/* Spacing div for right padding */}
          <div className="w-4 flex-shrink-0 md:w-6" />
        </div>

        {/* Navigation arrows (desktop only) */}
        <div className="pointer-events-none absolute inset-y-0 left-0 right-0 hidden items-center justify-between px-2 md:flex">
          {/* Left arrow */}
          <button
            onClick={scrollPrev}
            disabled={!canScrollLeft}
            className={cn(
              'pointer-events-auto z-10',
              'flex h-12 w-12 items-center justify-center',
              'rounded-full border border-white/10 bg-black/60',
              'backdrop-blur-md backdrop-saturate-150',
              'transition-all duration-300',
              'hover:scale-110 hover:border-electric/50 hover:bg-black/80',
              'focus:outline-none focus:ring-2 focus:ring-electric/50',
              'disabled:cursor-not-allowed disabled:opacity-0',
              canScrollLeft ? 'opacity-80' : 'opacity-0'
            )}
            aria-label="Previous vibelogs"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>

          {/* Right arrow */}
          <button
            onClick={scrollNext}
            disabled={!canScrollRight}
            className={cn(
              'pointer-events-auto z-10',
              'flex h-12 w-12 items-center justify-center',
              'rounded-full border border-white/10 bg-black/60',
              'backdrop-blur-md backdrop-saturate-150',
              'transition-all duration-300',
              'hover:scale-110 hover:border-electric/50 hover:bg-black/80',
              'focus:outline-none focus:ring-2 focus:ring-electric/50',
              'disabled:cursor-not-allowed disabled:opacity-0',
              canScrollRight ? 'opacity-80' : 'opacity-0'
            )}
            aria-label="Next vibelogs"
          >
            <ArrowRight className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Scroll indicator dots (mobile) */}
        {vibelogs.length > 1 && (
          <div className="mt-4 flex justify-center gap-2 md:hidden">
            {vibelogs.map((vibelog, index) => (
              <button
                key={`dot-${vibelog.id}`}
                onClick={() => scrollToCard(index)}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  index === activeIndex ? 'w-6 bg-electric' : 'w-1.5 bg-white/30 hover:bg-white/50'
                )}
                aria-label={`Go to vibelog ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
