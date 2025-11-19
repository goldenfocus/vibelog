/**
 * ReactionPicker - Emoji Selector Dropdown
 *
 * Shows a grid of emojis for the user to pick from.
 * Includes recent/popular emojis and search.
 * Supports ALL emojis organized by categories.
 */

'use client';

import { Search, Clock, Smile, Heart, Zap, Coffee, Flag } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

import { cn } from '@/lib/utils';
import type { ReactionPickerProps } from '@/types/reactions';
import { REACTION_PRESETS } from '@/types/reactions';

// Comprehensive emoji list organized by categories
const ALL_EMOJIS = {
  smileys: {
    label: 'Smileys & People',
    icon: Smile,
    emojis: [
      '😀',
      '😃',
      '😄',
      '😁',
      '😆',
      '😅',
      '🤣',
      '😂',
      '🙂',
      '🙃',
      '😉',
      '😊',
      '😇',
      '🥰',
      '😍',
      '🤩',
      '😘',
      '😗',
      '😚',
      '😙',
      '😋',
      '😛',
      '😜',
      '🤪',
      '😝',
      '🤑',
      '🤗',
      '🤭',
      '🤫',
      '🤔',
      '🤐',
      '🤨',
      '😐',
      '😑',
      '😶',
      '😏',
      '😒',
      '🙄',
      '😬',
      '🤥',
      '😌',
      '😔',
      '😪',
      '🤤',
      '😴',
      '😷',
      '🤒',
      '🤕',
      '🤢',
      '🤮',
      '🤧',
      '🥵',
      '🥶',
      '🥴',
      '😵',
      '🤯',
      '🤠',
      '🥳',
      '😎',
      '🤓',
      '🧐',
      '😕',
      '😟',
      '🙁',
      '☹️',
      '😮',
      '😯',
      '😲',
      '😳',
      '🥺',
      '😦',
      '😧',
      '😨',
      '😰',
      '😥',
      '😢',
      '😭',
      '😱',
      '😖',
      '😣',
      '😞',
      '😓',
      '😩',
      '😫',
      '🥱',
      '😤',
      '😡',
      '😠',
      '🤬',
      '👍',
      '👎',
      '👏',
      '🙌',
      '👋',
      '🤝',
      '🙏',
      '💪',
      '🤟',
      '✌️',
      '🤞',
      '🤘',
      '👌',
      '🤌',
      '👈',
      '👉',
      '👆',
      '👇',
      '☝️',
      '✋',
      '🤚',
      '🖐️',
      '🖖',
    ],
  },
  hearts: {
    label: 'Hearts & Emotions',
    icon: Heart,
    emojis: [
      '❤️',
      '🧡',
      '💛',
      '💚',
      '💙',
      '💜',
      '🖤',
      '🤍',
      '🤎',
      '💔',
      '❣️',
      '💕',
      '💞',
      '💓',
      '💗',
      '💖',
      '💘',
      '💝',
      '💟',
      '💌',
      '💋',
      '💯',
      '💢',
      '💥',
      '💫',
      '💦',
      '💨',
      '🕳️',
      '💬',
      '👁️‍🗨️',
      '🗨️',
      '🗯️',
      '💭',
      '💤',
    ],
  },
  activities: {
    label: 'Activities & Sports',
    icon: Zap,
    emojis: [
      '⚽',
      '🏀',
      '🏈',
      '⚾',
      '🥎',
      '🎾',
      '🏐',
      '🏉',
      '🥏',
      '🎱',
      '🪀',
      '🏓',
      '🏸',
      '🏒',
      '🏑',
      '🥍',
      '🏏',
      '🥅',
      '⛳',
      '🪁',
      '🏹',
      '🎣',
      '🤿',
      '🥊',
      '🥋',
      '🎽',
      '🛹',
      '🛷',
      '⛸️',
      '🥌',
      '🎿',
      '⛷️',
      '🏂',
      '🪂',
      '🏋️',
      '🤼',
      '🤸',
      '🤺',
      '⛹️',
      '🤾',
      '🏌️',
      '🏇',
      '🧘',
      '🏄',
      '🏊',
      '🤽',
      '🚣',
      '🧗',
      '🚵',
      '🚴',
      '🏆',
      '🥇',
      '🥈',
      '🥉',
      '🏅',
      '🎖️',
      '🎗️',
      '🎫',
      '🎟️',
      '🎪',
      '🎭',
      '🎨',
      '🎬',
      '🎤',
      '🎧',
      '🎼',
      '🎹',
      '🥁',
      '🎷',
      '🎺',
      '🎸',
      '🪕',
      '🎻',
      '🎲',
      '♟️',
      '🎯',
      '🎳',
      '🎮',
      '🎰',
      '🧩',
    ],
  },
  food: {
    label: 'Food & Drink',
    icon: Coffee,
    emojis: [
      '🍎',
      '🍏',
      '🍊',
      '🍋',
      '🍌',
      '🍉',
      '🍇',
      '🍓',
      '🫐',
      '🍈',
      '🍒',
      '🍑',
      '🥭',
      '🍍',
      '🥥',
      '🥝',
      '🍅',
      '🍆',
      '🥑',
      '🥦',
      '🥬',
      '🥒',
      '🌶️',
      '🫑',
      '🌽',
      '🥕',
      '🫒',
      '🧄',
      '🧅',
      '🥔',
      '🍠',
      '🥐',
      '🥯',
      '🍞',
      '🥖',
      '🥨',
      '🧀',
      '🥚',
      '🍳',
      '🧈',
      '🥞',
      '🧇',
      '🥓',
      '🥩',
      '🍗',
      '🍖',
      '🦴',
      '🌭',
      '🍔',
      '🍟',
      '🍕',
      '🫓',
      '🥪',
      '🥙',
      '🧆',
      '🌮',
      '🌯',
      '🫔',
      '🥗',
      '🥘',
      '🫕',
      '🥫',
      '🍝',
      '🍜',
      '🍲',
      '🍛',
      '🍣',
      '🍱',
      '🥟',
      '🦪',
      '🍤',
      '🍙',
      '🍚',
      '🍘',
      '🍥',
      '🥠',
      '🥮',
      '🍢',
      '🍡',
      '🍧',
      '🍨',
      '🍦',
      '🥧',
      '🧁',
      '🍰',
      '🎂',
      '🍮',
      '🍭',
      '🍬',
      '🍫',
      '🍿',
      '🍩',
      '🍪',
      '🌰',
      '🥜',
      '🍯',
      '🥛',
      '🍼',
      '☕',
      '🫖',
      '🍵',
      '🧃',
      '🥤',
      '🧋',
      '🍶',
      '🍺',
      '🍻',
      '🥂',
      '🍷',
      '🥃',
      '🍸',
      '🍹',
      '🧉',
      '🍾',
      '🧊',
    ],
  },
  symbols: {
    label: 'Symbols & Objects',
    icon: Flag,
    emojis: [
      '❤️',
      '🧡',
      '💛',
      '💚',
      '💙',
      '💜',
      '🖤',
      '🤍',
      '🤎',
      '💔',
      '❣️',
      '💕',
      '💞',
      '💓',
      '💗',
      '💖',
      '💘',
      '💝',
      '🔥',
      '✨',
      '💫',
      '⭐',
      '🌟',
      '✅',
      '❌',
      '⚡',
      '💯',
      '🎯',
      '🎉',
      '🎊',
      '🎈',
      '🎁',
      '🏆',
      '🥇',
      '🥈',
      '🥉',
      '🏅',
      '🎖️',
      '🔔',
      '🔕',
      '🎵',
      '🎶',
      '💰',
      '💸',
      '💵',
      '💴',
      '💶',
      '💷',
      '🪙',
      '💳',
      '🔨',
      '🔧',
      '🔩',
      '⚙️',
      '🛠️',
      '🚀',
      '🛸',
      '💻',
      '⌨️',
      '🖥️',
      '🖨️',
      '🖱️',
      '🖲️',
      '💽',
      '💾',
      '💿',
      '📀',
      '🧮',
      '📱',
      '📲',
      '☎️',
      '📞',
      '📟',
      '📠',
      '📺',
      '📻',
      '🎙️',
      '🎚️',
      '🎛️',
      '⏱️',
      '⏲️',
      '⏰',
      '🕰️',
      '⌛',
      '⏳',
      '📡',
      '🔋',
      '🔌',
      '💡',
      '🔦',
      '🕯️',
      '🪔',
      '🧯',
    ],
  },
};

export function ReactionPicker({
  onSelect,
  onClose,
  recentEmojis = [],
  popularEmojis: _popularEmojis = REACTION_PRESETS.DEFAULT,
  searchable: _searchable = false,
  maxRecents = 6,
  className,
}: ReactionPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<keyof typeof ALL_EMOJIS>('smileys');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Handle emoji selection
  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    onClose?.();
  };

  // Get all emojis from all categories for search
  const allEmojisFlat = Object.values(ALL_EMOJIS).flatMap(cat => cat.emojis);

  // Filter emojis based on search
  const displayedEmojis = searchQuery
    ? allEmojisFlat.filter(emoji => emoji.includes(searchQuery))
    : ALL_EMOJIS[activeCategory].emojis;

  const displayedRecents = recentEmojis.slice(0, maxRecents);

  return (
    <div
      className={cn(
        'absolute bottom-full left-0 z-50 mb-2 w-[320px] rounded-xl border border-border/50 bg-background shadow-xl',
        className
      )}
    >
      {/* Search */}
      <div className="border-b border-border/30 p-3">
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

      {/* Recent Emojis */}
      {displayedRecents.length > 0 && !searchQuery && (
        <div className="border-b border-border/30 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Recent</span>
          </div>
          <div className="grid grid-cols-8 gap-1">
            {displayedRecents.map(emoji => (
              <button
                key={`recent-${emoji}`}
                onClick={() => handleSelect(emoji)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-xl transition-all hover:bg-muted active:scale-95"
                aria-label={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category Tabs */}
      {!searchQuery && (
        <div className="flex items-center gap-1 border-b border-border/30 px-2 py-2">
          {(Object.keys(ALL_EMOJIS) as Array<keyof typeof ALL_EMOJIS>).map(category => {
            const cat = ALL_EMOJIS[category];
            const Icon = cat.icon;
            return (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs transition-all',
                  activeCategory === category
                    ? 'bg-electric/10 text-electric'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
                aria-label={cat.label}
                title={cat.label}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      )}

      {/* Emoji Grid */}
      <div className="max-h-[280px] overflow-y-auto p-3">
        {searchQuery && (
          <div className="mb-2 text-xs font-medium text-muted-foreground">
            Search Results ({displayedEmojis.length})
          </div>
        )}
        <div className="grid grid-cols-8 gap-1">
          {displayedEmojis.map(emoji => (
            <button
              key={`emoji-${emoji}-${activeCategory}-${searchQuery}`}
              onClick={() => handleSelect(emoji)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-xl transition-all hover:bg-muted active:scale-95"
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
      <div className="border-t border-border/30 px-3 py-2 text-center text-xs text-muted-foreground">
        Click outside to close
      </div>
    </div>
  );
}
