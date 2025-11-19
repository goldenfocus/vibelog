/**
 * ReactionButton - Single Emoji Reaction Button
 *
 * Displays a single emoji reaction with count and active state.
 * Used inside ReactionBar or standalone.
 */

'use client';

import { cn } from '@/lib/utils';
import type { ReactionButtonProps } from '@/types/reactions';

export function ReactionButton({
  emoji,
  count,
  isActive,
  onToggle,
  size = 'md',
  variant = 'pill',
  showCount = true,
  disabled = false,
  className,
  onHover,
}: ReactionButtonProps) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2',
  };

  const variantClasses = {
    pill: 'rounded-full',
    square: 'rounded-md',
    minimal: 'rounded',
  };

  const emojiSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => onHover?.([])} // TODO: Pass actual user IDs
      disabled={disabled}
      className={cn(
        // Base styles
        'group inline-flex items-center border transition-all duration-200',
        sizeClasses[size],
        variantClasses[variant],

        // Active state
        isActive
          ? 'border-electric/50 bg-electric/10 text-electric hover:bg-electric/20'
          : 'border-border/50 bg-background hover:border-electric/30 hover:bg-muted/50',

        // Disabled state
        disabled && 'cursor-not-allowed opacity-50',

        // Interactive states
        !disabled && 'hover:scale-105 active:scale-95',

        className
      )}
      aria-label={`React with ${emoji}`}
      aria-pressed={isActive}
    >
      {/* Emoji */}
      <span className={cn('leading-none', emojiSizes[size])} role="img" aria-label={emoji}>
        {emoji}
      </span>

      {/* Count */}
      {showCount && count > 0 && (
        <span className="font-medium tabular-nums leading-none">{count}</span>
      )}
    </button>
  );
}
