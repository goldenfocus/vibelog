'use client';

import { useRef, useState, useCallback } from 'react';

import { cn } from '@/lib/utils';

import { CommentCard, type CommentCardData } from './CommentCard';

interface CommentCarouselProps {
  comments: CommentCardData[];
}

export function CommentCarousel({ comments }: CommentCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

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
    return null;
  }

  return (
    <section
      className="relative w-full"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="Comment carousel"
    >
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
