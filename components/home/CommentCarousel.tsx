'use client';

import { ArrowLeft, ArrowRight, MessageCircle } from 'lucide-react';
import { useRef, useState, useCallback } from 'react';

import { cn } from '@/lib/utils';

import { CommentCard, type CommentCardData } from './CommentCard';

interface CommentCarouselProps {
  comments: CommentCardData[];
  title?: string;
  subtitle?: string;
}

export function CommentCarousel({ comments, title, subtitle }: CommentCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const cardWidth = 260;
  const gap = 16;
  const totalCardWidth = cardWidth + gap;

  const getActiveCardIndex = useCallback((): number => {
    if (!containerRef.current) {
      return 0;
    }
    return Math.round(containerRef.current.scrollLeft / totalCardWidth);
  }, [totalCardWidth]);

  const scrollToCard = useCallback(
    (index: number) => {
      if (!containerRef.current) {
        return;
      }
      containerRef.current.scrollTo({
        left: index * totalCardWidth,
        behavior: 'smooth',
      });
    },
    [totalCardWidth]
  );

  const updateScrollState = useCallback(() => {
    if (!containerRef.current) {
      return;
    }

    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    setActiveIndex(getActiveCardIndex());
  }, [getActiveCardIndex]);

  const scrollPrev = () => {
    const currentIndex = getActiveCardIndex();
    if (currentIndex > 0) {
      scrollToCard(currentIndex - 1);
    }
  };

  const scrollNext = () => {
    const currentIndex = getActiveCardIndex();
    if (currentIndex < comments.length - 1) {
      scrollToCard(currentIndex + 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scrollPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      scrollNext();
    }
  };

  if (!comments || comments.length === 0) {
    return (
      <section className="py-6">
        {(title || subtitle) && (
          <div className="mb-4 flex items-center gap-2 px-4 md:px-6">
            <MessageCircle className="h-5 w-5 text-electric" />
            {title && <h2 className="text-lg font-semibold text-foreground md:text-xl">{title}</h2>}
          </div>
        )}
        <div className="rounded-xl border border-border/30 bg-card/30 p-6 text-center">
          <MessageCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            No comments yet. Be the first to share your vibe!
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="relative w-full py-6"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label={title || 'Comment carousel'}
    >
      {/* Header with navigation */}
      <div className="mb-4 flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-electric" />
          {title && <h2 className="text-lg font-semibold text-foreground md:text-xl">{title}</h2>}
          {subtitle && (
            <span className="hidden text-sm text-muted-foreground sm:inline">· {subtitle}</span>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-2">
          <button
            onClick={scrollPrev}
            disabled={!canScrollLeft}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full border border-border/50 bg-card/50 transition-all',
              canScrollLeft
                ? 'hover:border-electric/50 hover:bg-electric/10'
                : 'cursor-not-allowed opacity-40'
            )}
            aria-label="Previous comments"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            onClick={scrollNext}
            disabled={!canScrollRight}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full border border-border/50 bg-card/50 transition-all',
              canScrollRight
                ? 'hover:border-electric/50 hover:bg-electric/10'
                : 'cursor-not-allowed opacity-40'
            )}
            aria-label="Next comments"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Carousel container */}
      <div
        ref={containerRef}
        className={cn(
          'flex gap-4 overflow-x-auto overflow-y-hidden px-4 pb-4 md:px-6',
          'snap-x snap-mandatory',
          'scrollbar-hide'
        )}
        onScroll={updateScrollState}
        style={{
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain none',
          touchAction: 'pan-x',
        }}
      >
        {comments.map((comment, index) => (
          <CommentCard
            key={comment.id}
            comment={comment}
            index={index}
            isActive={index === activeIndex}
          />
        ))}
      </div>

      {/* Progress dots (for mobile) */}
      {comments.length > 1 && comments.length <= 10 && (
        <div className="mt-2 flex justify-center gap-1.5 md:hidden">
          {comments.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollToCard(index)}
              className={cn(
                'h-1.5 rounded-full transition-all duration-200',
                index === activeIndex ? 'w-4 bg-electric' : 'w-1.5 bg-border/60'
              )}
              aria-label={`Go to comment ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
