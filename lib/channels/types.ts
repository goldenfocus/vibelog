/**
 * Channel System - Core Types
 *
 * Multi-channel architecture types for VibeLog's creator platform.
 * Each @handle is a channel, owned by a user account.
 */

// ============================================================================
// CORE TYPES
// ============================================================================

/**
 * AI Persona configuration for channel-specific voice and tone
 */
export interface ChannelPersona {
  /** TTS voice ID (OpenAI voices: alloy, echo, fable, onyx, nova, shimmer) */
  voice_id?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  /** Overall tone of content */
  tone?: 'professional' | 'casual' | 'warm' | 'energetic' | 'calm';
  /** Content style */
  style?: 'conversational' | 'educational' | 'storytelling' | 'news';
  /** Level of formality */
  formality?: 'formal' | 'casual' | 'mixed';
  /** Primary language for the channel */
  language?: string;
}

/**
 * Channel - A creator identity with its own brand and audience
 */
export interface Channel {
  id: string;
  owner_id: string;

  // Identity
  handle: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  header_image: string | null;

  // Social Links
  website_url: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  facebook_url: string | null;
  threads_url: string | null;

  // Categorization
  primary_topic: string | null;
  topics: string[];
  tags: string[];

  // AI Persona
  persona: ChannelPersona;

  // Settings
  is_default: boolean;
  is_public: boolean;
  allow_collabs: boolean;

  // Stats (denormalized for performance)
  subscriber_count: number;
  vibelog_count: number;
  total_views: number;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Minimal channel info for lists and selectors
 */
export interface ChannelSummary {
  id: string;
  handle: string;
  name: string;
  avatar_url: string | null;
  subscriber_count: number;
  vibelog_count: number;
  is_default: boolean;
}

/**
 * Channel with owner info (for public display)
 */
export interface ChannelWithOwner extends Channel {
  owner: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

// ============================================================================
// SUBSCRIPTION TYPES
// ============================================================================

/**
 * Channel subscription - User subscribed to a channel
 */
export interface ChannelSubscription {
  id: string;
  channel_id: string;
  user_id: string;

  // Notification preferences
  notify_new_vibelogs: boolean;
  notify_live: boolean;

  // Engagement
  last_viewed_at: string | null;

  created_at: string;
}

/**
 * Subscription with channel info (for "My Subscriptions" list)
 */
export interface SubscriptionWithChannel extends ChannelSubscription {
  channel: ChannelSummary;
}

// ============================================================================
// MEMBER/COLLABORATION TYPES
// ============================================================================

/**
 * Channel member roles
 */
export type ChannelMemberRole = 'owner' | 'admin' | 'editor' | 'viewer';

/**
 * Fine-grained permissions for channel members
 */
export interface ChannelPermissions {
  can_post?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
  can_analytics?: boolean;
  can_settings?: boolean;
  can_members?: boolean;
}

/**
 * Channel member - User with role on a channel
 */
export interface ChannelMember {
  id: string;
  channel_id: string;
  user_id: string;
  role: ChannelMemberRole;
  permissions: ChannelPermissions;
  invited_by: string | null;
  created_at: string;
}

/**
 * Channel member with user info (for team management)
 */
export interface ChannelMemberWithUser extends ChannelMember {
  user: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    email: string | null;
  };
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Create channel request
 */
export interface CreateChannelRequest {
  handle: string;
  name: string;
  bio?: string;
  avatar_url?: string;
  header_image?: string;
  primary_topic?: string;
  topics?: string[];
  tags?: string[];
  persona?: ChannelPersona;
  is_public?: boolean;
}

/**
 * Update channel request (partial)
 */
export interface UpdateChannelRequest {
  name?: string;
  bio?: string;
  avatar_url?: string;
  header_image?: string;

  // Social links
  website_url?: string;
  twitter_url?: string;
  instagram_url?: string;
  youtube_url?: string;
  tiktok_url?: string;
  linkedin_url?: string;
  github_url?: string;
  facebook_url?: string;
  threads_url?: string;

  // Categorization
  primary_topic?: string;
  topics?: string[];
  tags?: string[];

  // AI Persona
  persona?: ChannelPersona;

  // Settings
  is_public?: boolean;
  allow_collabs?: boolean;
}

/**
 * Channel list response with pagination
 */
export interface ChannelListResponse {
  channels: ChannelSummary[];
  total: number;
  has_more: boolean;
}

/**
 * Channel vibelogs list response
 */
export interface ChannelVibelogsResponse {
  vibelogs: {
    id: string;
    title: string;
    teaser: string | null;
    slug: string;
    cover_image_url: string | null;
    view_count: number;
    like_count: number;
    comment_count: number;
    published_at: string | null;
    created_at: string;
  }[];
  total: number;
  has_more: boolean;
}

/**
 * Subscribe/unsubscribe response
 */
export interface SubscriptionResponse {
  subscribed: boolean;
  subscriber_count: number;
}

// ============================================================================
// TOPIC CATEGORIES
// ============================================================================

/**
 * Predefined topic categories for channels
 * These match the content-extraction.ts categories
 */
export const CHANNEL_TOPICS = [
  'technology',
  'business',
  'personal-growth',
  'lifestyle',
  'health-wellness',
  'creativity',
  'education',
  'entertainment',
  'travel',
  'food-cooking',
  'relationships',
  'career',
  'finance',
  'parenting',
  'sports',
  'science',
  'politics',
  'culture',
  'spirituality',
  'other',
] as const;

export type ChannelTopic = (typeof CHANNEL_TOPICS)[number];

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Handle validation regex (matches database constraint)
 * - 3-30 characters
 * - Starts with lowercase letter or number
 * - Can contain lowercase letters, numbers, underscores, hyphens
 */
export const HANDLE_REGEX = /^[a-z0-9][a-z0-9_-]{2,29}$/;

/**
 * Validate channel handle
 */
export function isValidHandle(handle: string): boolean {
  return HANDLE_REGEX.test(handle);
}

/**
 * Normalize handle (lowercase, trim)
 */
export function normalizeHandle(handle: string): string {
  return handle.toLowerCase().trim();
}
