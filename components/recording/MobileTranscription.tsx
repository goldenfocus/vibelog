'use client';

import { useEffect } from 'react';

import { useAutoScroll } from '@/hooks/useAutoScroll';
import { RECORDING_UI } from '@/lib/mobile/constants';
import { cn } from '@/lib/utils';

export interface MobileTranscriptionProps {
  /**
   * Transcription text
   */
  text: string;

  /**
   * Is currently transcribing
   */
  isTranscribing: boolean;

  /**
   * Custom className for container
   */
  className?: string;

  /**
   * Show background
   * @default true
   */
  showBackground?: boolean;

  /**
   * Animate new words
   * @default true
   */
  animateWords?: boolean;
}

/**
 * Mobile transcription overlay
 * Large, readable text with auto-scroll
 * Designed for easy reading while recording
 *
 * @example
 * <MobileTranscription
 *   text={transcript}
 *   isTranscribing={isRecording}
 * />
 */
export function MobileTranscription({
  text,
  isTranscribing,
  className,
  showBackground = true,
  animateWords = true,
}: MobileTranscriptionProps) {
  const { containerRef, scrollToBottom } = useAutoScroll({
    smooth: true,
    onlyWhenNearBottom: true,
    dependencies: [text],
  });

  // Force scroll when text changes
  useEffect(() => {
    if (text) {
      scrollToBottom();
    }
  }, [text, scrollToBottom]);

  // Split text into words for animation
  const words = text.split(' ');

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-y-auto',
        'scrollbar-hide', // Hide scrollbar for cleaner look
        showBackground && [
          'rounded-2xl',
          'bg-gradient-to-b from-background/95 to-background/80',
          'backdrop-blur-xl',
          'border border-border/50',
        ],
        className
      )}
      style={{
        fontSize: RECORDING_UI.TRANSCRIPTION_FONT.MOBILE,
        WebkitOverflowScrolling: 'touch',
      }}
      aria-live="polite"
      aria-label="Live transcription"
    >
      <div className="p-6">
        {text ? (
          <p className="leading-relaxed text-foreground">
            {animateWords && isTranscribing
              ? // Animated word-by-word appearance
                // Using word + index combination for better key uniqueness
                words.map((word, index) => (
                  <span
                    key={`word-${index}-${word.slice(0, 3)}`}
                    className="inline-block duration-300 animate-in fade-in slide-in-from-bottom-2"
                    style={{
                      animationDelay: `${index * 50}ms`,
                      animationFillMode: 'backwards',
                    }}
                  >
                    {word}{' '}
                  </span>
                ))
              : // Static text when not transcribing
                text}
          </p>
        ) : (
          // Empty state
          <p className="text-center italic text-muted-foreground">
            {isTranscribing ? 'Listening...' : 'Your transcription will appear here'}
          </p>
        )}

        {/* Cursor indicator when transcribing */}
        {isTranscribing && text && (
          <span
            className="ml-1 inline-block h-6 w-0.5 animate-pulse bg-primary"
            aria-hidden="true"
          />
        )}
      </div>

      {/* Scroll fade indicators */}
      {showBackground && text && (
        <>
          {/* Top fade */}
          <div
            className="pointer-events-none absolute left-0 right-0 top-0 h-8 bg-gradient-to-b from-background to-transparent"
            aria-hidden="true"
          />
          {/* Bottom fade */}
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent"
            aria-hidden="true"
          />
        </>
      )}
    </div>
  );
}
