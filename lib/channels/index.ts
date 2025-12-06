/**
 * Channel System - Public API
 *
 * Re-exports all public types and functions for the channel system.
 */

// Types
export type {
  Channel,
  ChannelMember,
  ChannelMemberRole,
  ChannelMemberWithUser,
  ChannelPermissions,
  ChannelPersona,
  ChannelSummary,
  ChannelSubscription,
  ChannelTopic,
  ChannelVibelogsResponse,
  ChannelWithOwner,
  CreateChannelRequest,
  SubscriptionResponse,
  SubscriptionWithChannel,
  UpdateChannelRequest,
} from './types';

// Constants and validation
export { CHANNEL_TOPICS, HANDLE_REGEX, isValidHandle, normalizeHandle } from './types';

// Service functions
export {
  // Channel CRUD
  getChannelByHandle,
  getChannelById,
  getUserDefaultChannel,
  getUserChannels,
  createChannel,
  updateChannel,
  deleteChannel,
  isHandleAvailable,

  // Subscriptions
  subscribeToChannel,
  unsubscribeFromChannel,
  isSubscribedToChannel,
  getUserSubscriptions,
  getChannelSubscribers,

  // Members
  addChannelMember,
  removeChannelMember,
  getChannelMembers,

  // Content
  getChannelVibelogs,

  // Discovery
  getPopularChannels,
  getChannelsByTopic,
  searchChannels,
} from './channel-service';

// Auto-channel service (for automatic channel creation from topics)
export {
  ensureChannelForTopic,
  assignVibelogToTopicChannel,
  getUserChannelByTopic,
} from './auto-channel-service';
export type { AutoChannelResult } from './auto-channel-service';

// AI name generation
export { generateChannelName, getTopicDisplayName, TOPIC_DISPLAY_NAMES } from './ai-name-generator';

// Theme styles (colors, icons, gradients for topics)
export {
  THEME_STYLES,
  getThemeStyle,
  getTopicIcon,
  getTopicGradient,
  getTopicGlow,
  getTopicEmoji,
} from './theme-styles';
export type { ThemeStyle } from './theme-styles';
