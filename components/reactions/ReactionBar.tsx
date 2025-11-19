/**
 * ReactionBar - Universal Reaction Component
 *
 * Complete reaction UI that works with any content type.
 * Drop this component anywhere to add reactions!
 *
 * @example
 * ```tsx
 * // For comments
 * <ReactionBar type="comment" id={comment.id} />
 *
 * // For vibelogs
 * <ReactionBar type="vibelog" id={vibelog.id} variant="expanded" />
 *
 * // For live chat
 * <ReactionBar type="chat_message" id={message.id} variant="minimal" realtime />
 * ```
 */

'use client';

import { Smile, Plus } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

import { useReactions } from '@/hooks/useReactions';
import { cn } from '@/lib/utils';
import type { ReactionBarProps } from '@/types/reactions';
import { REACTION_PRESETS } from '@/types/reactions';

import { ReactionButton } from './ReactionButton';
import { ReactionPicker } from './ReactionPicker';

export function ReactionBar({
  type,
  id,
  variant = 'compact',
  size = 'md',
  maxVisible = 6,
  showAddButton = true,
  showCounts = true,
  showTooltips = false,
  emojiSet,
  realtime = false,
  optimistic: _optimistic = true,
  maxReactionsPerUser,
  maxTotalReactions,
  canReact,
  onReactionClick,
  onReactionAdd,
  onReactionRemove,
  className,
}: ReactionBarProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const pickerRef = useRef<HTMLDivElement>(null);

  const { reactions, isLoading, userReactions, totalCount, toggleReaction } = useReactions({
    type,
    id,
    realtime,
    onReactionAdded: onReactionAdd,
    onReactionRemoved: onReactionRemove,
  });

  // Click outside to close picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    };

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPicker]);

  // Handle emoji selection from picker
  const handleEmojiSelect = async (emoji: string) => {
    // Check permissions
    if (canReact && !canReact(null, emoji)) {
      // TODO: Get user from context
      return;
    }

    // Check limits
    if (maxReactionsPerUser && userReactions.length >= maxReactionsPerUser) {
      return;
    }

    if (maxTotalReactions && totalCount >= maxTotalReactions) {
      return;
    }

    await toggleReaction(emoji);

    // Update recents
    setRecentEmojis(prev => {
      const filtered = prev.filter(e => e !== emoji);
      return [emoji, ...filtered].slice(0, 6);
    });

    setShowPicker(false);
  };

  // Handle reaction button click
  const handleReactionToggle = async (emoji: string) => {
    onReactionClick?.(emoji, []);
    await toggleReaction(emoji);
  };

  // Get visible reactions
  const visibleReactions = reactions.slice(0, maxVisible);
  const hiddenCount = Math.max(0, reactions.length - maxVisible);

  // Available emojis for picker
  const availableEmojis = emojiSet || REACTION_PRESETS.DEFAULT;

  // Variant-specific container classes
  const variantClasses = {
    compact: 'flex-row flex-wrap gap-1.5',
    expanded: 'flex-row flex-wrap gap-2 p-2 rounded-lg border border-border/30 bg-muted/20',
    minimal: 'flex-row gap-1',
    stacked: 'flex-col gap-1',
  };

  return (
    <div className={cn('relative flex items-center', variantClasses[variant], className)}>
      {/* Loading state */}
      {isLoading && <div className="text-xs text-muted-foreground">Loading reactions...</div>}

      {/* Reaction buttons */}
      {!isLoading &&
        visibleReactions.map(reaction => (
          <ReactionButton
            key={reaction.emoji}
            emoji={reaction.emoji}
            count={reaction.count}
            isActive={reaction.user_reacted}
            onToggle={() => handleReactionToggle(reaction.emoji)}
            size={size}
            variant="pill"
            showCount={showCounts}
            onHover={
              showTooltips
                ? _users => {
                    // TODO: Show tooltip with users
                  }
                : undefined
            }
          />
        ))}

      {/* Hidden reactions count */}
      {hiddenCount > 0 && (
        <button
          className="flex items-center gap-1 rounded-full border border-border/50 bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground transition-all hover:border-electric/30 hover:bg-muted"
          aria-label={`${hiddenCount} more reactions`}
        >
          <Plus className="h-3 w-3" />
          <span>{hiddenCount}</span>
        </button>
      )}

      {/* Add reaction button */}
      {showAddButton && (
        <div ref={pickerRef} className="relative">
          <button
            onClick={() => setShowPicker(!showPicker)}
            className={cn(
              'flex items-center gap-1.5 rounded-full border border-border/50 px-3 py-1.5 text-sm text-muted-foreground transition-all hover:border-electric/30 hover:bg-muted hover:text-foreground',
              size === 'sm' && 'px-2 py-1 text-xs',
              size === 'lg' && 'px-4 py-2 text-base'
            )}
            aria-label="Add reaction"
            aria-expanded={showPicker}
          >
            <Smile
              className={cn('h-4 w-4', size === 'sm' && 'h-3 w-3', size === 'lg' && 'h-5 w-5')}
            />
            {variant !== 'minimal' && <span>React</span>}
          </button>

          {/* Emoji picker */}
          {showPicker && (
            <ReactionPicker
              onSelect={handleEmojiSelect}
              onClose={() => setShowPicker(false)}
              recentEmojis={recentEmojis}
              popularEmojis={availableEmojis}
              searchable={variant === 'expanded'}
            />
          )}
        </div>
      )}
    </div>
  );
}
