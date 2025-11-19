/**
 * ReactionPicker - Emoji Selector Dropdown
 *
 * Shows a grid of emojis for the user to pick from.
 * Includes recent/popular emojis and search.
 */

'use client';

import { Search, Clock, TrendingUp } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

import { cn } from '@/lib/utils';
import type { ReactionPickerProps } from '@/types/reactions';
import { REACTION_PRESETS } from '@/types/reactions';

export function ReactionPicker({
  onSelect,
  onClose,
  recentEmojis = [],
  popularEmojis = REACTION_PRESETS.DEFAULT,
  searchable = false,
  maxRecents = 6,
  className,
}: ReactionPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input
  useEffect(() => {
    if (searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchable]);

  // Handle emoji selection
  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    onClose?.();
  };

  // Filter emojis based on search (simplified, you can use emoji-picker-react for advanced)
  const displayedEmojis = searchQuery
    ? [...popularEmojis].filter(emoji => emoji.includes(searchQuery))
    : [...popularEmojis];

  const displayedRecents = recentEmojis.slice(0, maxRecents);

  return (
    <div
      className={cn(
        'absolute bottom-full left-0 z-50 mb-2 min-w-[280px] rounded-xl border border-border/50 bg-background p-3 shadow-xl',
        className
      )}
    >
      {/* Search */}
      {searchable && (
        <div className="mb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search emoji..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border/50 bg-muted/30 py-2 pl-10 pr-3 text-sm outline-none transition-colors focus:border-electric/50 focus:bg-background"
            />
          </div>
        </div>
      )}

      {/* Recent Emojis */}
      {displayedRecents.length > 0 && !searchQuery && (
        <div className="mb-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Recent</span>
          </div>
          <div className="grid grid-cols-6 gap-1">
            {displayedRecents.map(emoji => (
              <button
                key={`recent-${emoji}`}
                onClick={() => handleSelect(emoji)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-2xl transition-all hover:bg-muted active:scale-95"
                aria-label={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Popular/All Emojis */}
      <div>
        {!searchQuery && (
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Popular</span>
          </div>
        )}
        <div className="grid grid-cols-6 gap-1">
          {displayedEmojis.map(emoji => (
            <button
              key={`emoji-${emoji}`}
              onClick={() => handleSelect(emoji)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-2xl transition-all hover:bg-muted active:scale-95"
              aria-label={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* No results */}
        {searchQuery && displayedEmojis.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">No emoji found</div>
        )}
      </div>

      {/* Close hint */}
      <div className="mt-3 border-t border-border/30 pt-2 text-center text-xs text-muted-foreground">
        Click outside to close
      </div>
    </div>
  );
}
