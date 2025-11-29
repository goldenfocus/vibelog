/**
 * QuickReactions - Unified Like + Reaction Button
 *
 * Mobile-optimized reaction component:
 * - Tap = Quick ❤️ like (toggle)
 * - Long-press (mobile) / Hover (desktop) = Show 9 reaction picker
 *
 * 9 Reactions: ❤️ 👍 🔥 😂 🎉 ✨ 💯 👎 😢
 */

'use client';

import { Heart, Loader2 } from 'lucide-react';
import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/I18nProvider';
import { cn } from '@/lib/utils';

// The 9 core reactions
const QUICK_REACTIONS = ['❤️', '👍', '🔥', '😂', '🎉', '✨', '💯', '👎', '😢'] as const;
type QuickReaction = (typeof QUICK_REACTIONS)[number];

const DEFAULT_REACTION: QuickReaction = '❤️';

interface QuickReactionsProps {
  // Content identifier
  contentType: 'vibelog' | 'comment' | 'chat_message';
  contentId: string;

  // Initial state (from parent)
  initialCount?: number;
  initialReaction?: string | null; // User's current reaction

  // Callbacks
  onReactionChange?: (reaction: string | null, count: number) => void;

  // Display options
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  variant?: 'default' | 'compact';
  className?: string;
}

export function QuickReactions({
  contentType,
  contentId,
  initialCount = 0,
  initialReaction = null,
  onReactionChange,
  size = 'md',
  showCount = true,
  variant = 'default',
  className,
}: QuickReactionsProps) {
  const { user } = useAuth();
  const { t } = useI18n();

  // State
  const [currentReaction, setCurrentReaction] = useState<string | null>(initialReaction);
  const [count, setCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  // Refs for long-press detection
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Sync with props when they change
  useEffect(() => {
    setCurrentReaction(initialReaction);
    setCount(initialCount);
  }, [initialReaction, initialCount]);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowPicker(false);
      }
    };

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPicker]);

  // API call to toggle reaction
  const toggleReaction = useCallback(
    async (emoji: string) => {
      if (!user) {
        toast.error(t('toasts.vibelogs.signInToLike'));
        return;
      }

      if (isLoading) {
        return;
      }

      // Optimistic update
      const wasReacted = currentReaction === emoji;
      const previousReaction = currentReaction;
      const previousCount = count;

      if (wasReacted) {
        // Remove reaction
        setCurrentReaction(null);
        setCount(prev => Math.max(0, prev - 1));
      } else {
        // Add/change reaction
        const hadPreviousReaction = currentReaction !== null;
        setCurrentReaction(emoji);
        setCount(prev => (hadPreviousReaction ? prev : prev + 1));
      }

      setIsLoading(true);

      try {
        let response: Response;
        let data: { like_count?: number; count?: number; liked?: boolean };

        // Use dedicated like API for vibelogs with default reaction
        if (contentType === 'vibelog' && emoji === DEFAULT_REACTION) {
          response = await fetch(`/api/like-vibelog/${contentId}`, {
            method: wasReacted ? 'DELETE' : 'POST',
            headers: { 'Content-Type': 'application/json' },
          });

          if (!response.ok) {
            throw new Error('Failed to update like');
          }

          data = await response.json();
          const newCount = data.like_count ?? (wasReacted ? previousCount - 1 : previousCount + 1);
          setCount(newCount);
          onReactionChange?.(wasReacted ? null : emoji, newCount);
        } else {
          // Use universal reactions API for other emojis/content types
          response = await fetch('/api/reactions', {
            method: wasReacted ? 'DELETE' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reactableType: contentType,
              reactableId: contentId,
              emoji,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to update reaction');
          }

          data = await response.json();
          const newCount = data.count ?? (wasReacted ? previousCount - 1 : previousCount + 1);
          setCount(newCount);
          onReactionChange?.(wasReacted ? null : emoji, newCount);
        }
      } catch {
        // Revert optimistic update
        setCurrentReaction(previousReaction);
        setCount(previousCount);
        toast.error(t('toasts.vibelogs.likeFailed'));
      } finally {
        setIsLoading(false);
      }
    },
    [user, isLoading, currentReaction, count, contentType, contentId, onReactionChange, t]
  );

  // Handle tap (quick like)
  const handleTap = useCallback(() => {
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }
    toggleReaction(DEFAULT_REACTION);
  }, [toggleReaction]);

  // Handle long-press start
  const handlePressStart = useCallback(() => {
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setShowPicker(true);
    }, 500); // 500ms for long-press
  }, []);

  // Handle long-press end
  const handlePressEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // Handle reaction selection from picker
  const handleSelectReaction = useCallback(
    (emoji: string) => {
      setShowPicker(false);
      toggleReaction(emoji);
    },
    [toggleReaction]
  );

  // Size classes
  const sizeClasses = {
    sm: {
      button: 'px-2 py-1 text-xs gap-1',
      icon: 'h-3.5 w-3.5',
      picker: 'p-1.5 gap-1',
      emoji: 'h-7 w-7 text-base',
    },
    md: {
      button: 'px-3 py-2 text-sm gap-1.5',
      icon: 'h-4 w-4',
      picker: 'p-2 gap-1.5',
      emoji: 'h-8 w-8 text-lg',
    },
    lg: {
      button: 'px-4 py-2.5 text-base gap-2',
      icon: 'h-5 w-5',
      picker: 'p-2.5 gap-2',
      emoji: 'h-10 w-10 text-xl',
    },
  };

  const _isCompact = variant === 'compact';
  const hasReacted = currentReaction !== null;
  const displayCount = hasReacted ? Math.max(1, count) : Math.max(0, count);

  return (
    <div className={cn('relative inline-flex', className)}>
      {/* Main button */}
      <button
        ref={buttonRef}
        onClick={handleTap}
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        onMouseEnter={() => !('ontouchstart' in window) && setShowPicker(true)}
        disabled={isLoading}
        className={cn(
          'group flex touch-manipulation items-center rounded-full border transition-all duration-200',
          sizeClasses[size].button,
          hasReacted
            ? 'border-red-200 bg-red-50 text-red-500 hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:hover:bg-red-900'
            : 'border-border/50 bg-background text-muted-foreground hover:border-red-200 hover:bg-red-50 hover:text-red-500 dark:hover:border-red-800 dark:hover:bg-red-950',
          isLoading && 'cursor-wait opacity-70',
          !isLoading && 'active:scale-95'
        )}
        aria-label={hasReacted ? t('titles.unlike') : t('titles.like')}
        aria-pressed={hasReacted}
      >
        {isLoading ? (
          <Loader2 className={cn(sizeClasses[size].icon, 'animate-spin')} />
        ) : currentReaction && currentReaction !== DEFAULT_REACTION ? (
          <span className={cn(sizeClasses[size].icon, 'leading-none')}>{currentReaction}</span>
        ) : (
          <Heart
            className={cn(
              sizeClasses[size].icon,
              hasReacted && 'fill-current',
              'transition-transform group-hover:scale-110'
            )}
          />
        )}

        {showCount && (
          <span className={cn('font-medium tabular-nums', hasReacted && 'text-red-500')}>
            {displayCount}
          </span>
        )}
      </button>

      {/* Reaction picker popup */}
      {showPicker && (
        <div
          ref={pickerRef}
          onMouseLeave={() => 'ontouchstart' in window || setShowPicker(false)}
          className={cn(
            'absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 transform',
            'flex rounded-full border border-border/50 bg-background shadow-xl',
            sizeClasses[size].picker,
            'duration-200 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2'
          )}
        >
          {QUICK_REACTIONS.map(emoji => (
            <button
              key={emoji}
              onClick={() => handleSelectReaction(emoji)}
              className={cn(
                'flex items-center justify-center rounded-full transition-all duration-150',
                sizeClasses[size].emoji,
                currentReaction === emoji
                  ? 'scale-110 bg-electric/10 ring-2 ring-electric/50'
                  : 'hover:scale-125 hover:bg-muted active:scale-95'
              )}
              aria-label={`React with ${emoji}`}
              aria-pressed={currentReaction === emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Export constants for use elsewhere
export { QUICK_REACTIONS, DEFAULT_REACTION };
export type { QuickReaction };
