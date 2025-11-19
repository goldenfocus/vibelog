/**
 * Universal Reactions System - TypeScript Types
 *
 * Polymorphic reaction system that works with any content type:
 * - Comments, Vibelogs, Chat Messages, Media, Profiles, etc.
 */

// ============================================================================
// CORE TYPES
// ============================================================================

/**
 * Supported reactable content types
 * Add new types here as you create new features
 */
export type ReactableType =
  | 'comment'
  | 'vibelog'
  | 'chat_message'
  | 'media'
  | 'profile'
  | 'playlist'
  | 'collection';

/**
 * Base reaction from database
 */
export interface Reaction {
  id: string;
  reactable_type: ReactableType;
  reactable_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

/**
 * Aggregated reaction summary (from view)
 */
export interface ReactionSummary {
  reactable_type: ReactableType;
  reactable_id: string;
  emoji: string;
  count: number;
  user_ids: string[];
  last_reacted_at: string;
}

/**
 * Client-side reaction state
 */
export interface ReactionState {
  emoji: string;
  count: number;
  user_ids: string[];
  user_reacted: boolean; // Does current user have this reaction?
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Add reaction request
 */
export interface AddReactionRequest {
  reactableType: ReactableType;
  reactableId: string;
  emoji: string;
}

/**
 * Remove reaction request
 */
export interface RemoveReactionRequest {
  reactableType: ReactableType;
  reactableId: string;
  emoji: string;
}

/**
 * Get reactions response
 */
export interface GetReactionsResponse {
  reactions: ReactionState[];
  total_count: number;
  user_reactions: string[]; // Emojis the current user reacted with
}

/**
 * Batch fetch request
 */
export interface BatchReactionsRequest {
  items: Array<{
    type: ReactableType;
    id: string;
  }>;
}

/**
 * Batch fetch response
 */
export type BatchReactionsResponse = Record<
  string, // key: "type:id" e.g. "comment:uuid"
  GetReactionsResponse
>;

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

export interface ReactionAnalytics {
  top_reactions: Array<{
    emoji: string;
    count: number;
    percentage: number;
  }>;
  reaction_velocity: {
    last_hour: number;
    last_day: number;
    last_week: number;
  };
  unique_reactors: number;
  reaction_diversity: number; // 0-1, how varied reactions are
}

// ============================================================================
// COMPONENT PROP TYPES
// ============================================================================

/**
 * ReactionButton component props
 */
export interface ReactionButtonProps {
  emoji: string;
  count: number;
  isActive: boolean;
  onToggle: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'pill' | 'square' | 'minimal';
  showCount?: boolean;
  disabled?: boolean;
  className?: string;
  onHover?: (users: string[]) => void; // Show who reacted
}

/**
 * ReactionPicker component props
 */
export interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose?: () => void;
  recentEmojis?: string[];
  popularEmojis?: readonly string[];
  categories?: string[];
  searchable?: boolean;
  maxRecents?: number;
  className?: string;
}

/**
 * ReactionBar component props (main component)
 */
export interface ReactionBarProps {
  // Content identifier
  type: ReactableType;
  id: string;

  // Visual variants
  variant?: 'compact' | 'expanded' | 'minimal' | 'stacked';
  size?: 'sm' | 'md' | 'lg';

  // Display options
  maxVisible?: number; // Max reactions to show before "+N more"
  showAddButton?: boolean;
  showCounts?: boolean;
  showTooltips?: boolean; // Show who reacted on hover

  // Custom emoji set
  emojiSet?: readonly string[]; // If provided, restrict to these emojis

  // Features
  realtime?: boolean; // Subscribe to real-time updates
  optimistic?: boolean; // Optimistic UI updates

  // Permissions & limits
  maxReactionsPerUser?: number;
  maxTotalReactions?: number;
  canReact?: (user: User | null, emoji: string) => boolean;

  // Callbacks
  onReactionClick?: (emoji: string, users: string[]) => void;
  onReactionAdd?: (emoji: string) => void;
  onReactionRemove?: (emoji: string) => void;

  // Styling
  className?: string;
}

/**
 * useReactions hook return type
 */
export interface UseReactionsReturn {
  // State
  reactions: ReactionState[];
  isLoading: boolean;
  error: Error | null;
  userReactions: string[]; // Emojis current user reacted with
  totalCount: number;

  // Actions
  addReaction: (emoji: string) => Promise<void>;
  removeReaction: (emoji: string) => Promise<void>;
  toggleReaction: (emoji: string) => Promise<void>;

  // Real-time
  subscribe: () => void;
  unsubscribe: () => void;
  isSubscribed: boolean;

  // Utilities
  hasUserReacted: (emoji: string) => boolean;
  getReactionCount: (emoji: string) => number;
  getUsersWhoReacted: (emoji: string) => string[];
}

/**
 * useReactions hook options
 */
export interface UseReactionsOptions {
  type: ReactableType;
  id: string;
  realtime?: boolean;
  enabled?: boolean; // For conditional fetching
  onReactionAdded?: (emoji: string) => void;
  onReactionRemoved?: (emoji: string) => void;
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export interface ReactionNotification {
  type: 'reaction';
  actor: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  action: 'reacted';
  emoji: string;
  target: {
    type: ReactableType;
    id: string;
    preview: string; // Text preview of the content
  };
  created_at: string;
}

// ============================================================================
// PRESET EMOJI SETS
// ============================================================================

export const REACTION_PRESETS = {
  DEFAULT: ['👍', '❤️', '😂', '🎉', '🤔', '👏'],
  VIBELOG: ['🔥', '💯', '🎯', '✨', '💜', '🚀'],
  LIVE_CHAT: ['👍', '❤️', '😂', '🎉', '🤔', '👏', '🙌', '💪'],
  MEDIA: ['😍', '🔥', '✨', '👀', '💯', '🎨'],
  PROFESSIONAL: ['👍', '💼', '🎯', '✅', '💡', '🚀'],
  CASUAL: ['😊', '❤️', '😂', '🎉', '👀', '🤷'],
  CREATIVE: ['🎨', '✨', '🌟', '💫', '🎭', '🎪'],
} as const;

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Helper type to get the emoji set type
 */
export type EmojiSet = (typeof REACTION_PRESETS)[keyof typeof REACTION_PRESETS];

/**
 * User type (simplified, import from your auth types)
 */
export interface User {
  id: string;
  username: string;
  avatar_url: string | null;
  is_verified?: boolean;
}

/**
 * Real-time subscription payload
 */
export interface ReactionRealtimePayload {
  eventType: 'INSERT' | 'DELETE' | 'UPDATE';
  new: Reaction | null;
  old: Reaction | null;
}
