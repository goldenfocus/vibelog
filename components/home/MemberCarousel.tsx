'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useRef, useState, useCallback } from 'react';

import { cn } from '@/lib/utils';

import { MemberFloatingCard } from './MemberFloatingCard';

interface MemberVibelog {
  id: string;
  title: string;
  teaser?: string | null;
  slug?: string | null;
  public_slug?: string | null;
  audio_url?: string | null;
}

export interface CarouselMember {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio?: string | null;
  total_vibelogs?: number | null;
  latest_vibelog?: MemberVibelog | null;
}

interface MemberCarouselProps {
  members: CarouselMember[];
}

/**
 * Futuristic carousel for member profiles
 * Features smooth scroll, snap-to-card, and responsive design
 */
export function MemberCarousel({ members }: MemberCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const cardWidth = 96; // Avatar size on md screens
  const gap = 16;
  const totalCardWidth = cardWidth + gap;

  // Calculate active card index based on scroll position
  const getActiveCardIndex = useCallback((): number => {
    if (!containerRef.current) {
      return 0;
    }
    const currentScroll = containerRef.current.scrollLeft;
    return Math.round(currentScroll / totalCardWidth);
  }, [totalCardWidth]);

  // Scroll to specific card
  const scrollToCard = useCallback(
    (index: number) => {
      if (!containerRef.current) {
        return;
      }
      const targetScroll = index * totalCardWidth;
      containerRef.current.scrollTo({
        left: targetScroll,
        behavior: 'smooth',
      });
    },
    [totalCardWidth]
  );

  // Update scroll state
  const updateScrollState = useCallback(() => {
    if (!containerRef.current) {
      return;
    }

    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);

    const newIndex = getActiveCardIndex();
    setActiveIndex(newIndex);
  }, [getActiveCardIndex]);

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
    if (currentIndex < members.length - 1) {
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

  if (!members || members.length === 0) {
    return null;
  }

  return (
    <section
      className="relative w-full"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="Member carousel"
    >
      {/* Carousel container */}
      <div className="relative">
        {/* Scroll container */}
        <div
          ref={containerRef}
          className={cn(
            'flex gap-4 overflow-x-auto overflow-y-hidden px-4 pb-4 md:px-6',
            'snap-x snap-mandatory',
            'scrollbar-hide',
            '-mx-4 md:-mx-6'
          )}
          onScroll={handleScroll}
          style={{
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain none',
            touchAction: 'pan-x',
          }}
        >
          {/* Spacing div for left padding */}
          <div className="w-4 flex-shrink-0 md:w-6" />

          {/* Cards */}
          {members.map((member, index) => (
            <MemberFloatingCard
              key={member.id}
              member={member}
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
              'flex h-10 w-10 items-center justify-center',
              'rounded-full border border-white/10 bg-black/60',
              'backdrop-blur-md backdrop-saturate-150',
              'transition-all duration-300',
              'hover:scale-110 hover:border-electric/50 hover:bg-black/80',
              'focus:outline-none focus:ring-2 focus:ring-electric/50',
              'disabled:cursor-not-allowed disabled:opacity-0',
              canScrollLeft ? 'opacity-80' : 'opacity-0'
            )}
            aria-label="Previous members"
          >
            <ArrowLeft className="h-4 w-4 text-white" />
          </button>

          {/* Right arrow */}
          <button
            onClick={scrollNext}
            disabled={!canScrollRight}
            className={cn(
              'pointer-events-auto z-10',
              'flex h-10 w-10 items-center justify-center',
              'rounded-full border border-white/10 bg-black/60',
              'backdrop-blur-md backdrop-saturate-150',
              'transition-all duration-300',
              'hover:scale-110 hover:border-electric/50 hover:bg-black/80',
              'focus:outline-none focus:ring-2 focus:ring-electric/50',
              'disabled:cursor-not-allowed disabled:opacity-0',
              canScrollRight ? 'opacity-80' : 'opacity-0'
            )}
            aria-label="Next members"
          >
            <ArrowRight className="h-4 w-4 text-white" />
          </button>
        </div>

        {/* Scroll indicator dots (mobile) */}
        {members.length > 1 && (
          <div className="mt-3 flex justify-center gap-2 md:hidden">
            {members.map((member, index) => (
              <button
                key={`dot-${member.id}`}
                onClick={() => scrollToCard(index)}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  index === activeIndex ? 'w-5 bg-electric' : 'w-1.5 bg-white/30 hover:bg-white/50'
                )}
                aria-label={`Go to member ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
