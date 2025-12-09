/**
 * Shared TypeScript types for the VibeLog notification system
 *
 * This file consolidates all notification-related types to ensure consistency
 * across components, APIs, and database interactions.
 */

// ============================================================================
// CORE NOTIFICATION TYPES
// ============================================================================

export type NotificationType =
  | 'comment' // Someone commented on your vibelog
  | 'reply' // Someone replied to your comment
  | 'reaction' // Someone reacted to your comment/vibelog
  | 'mention' // Someone mentioned you
  | 'follow' // Someone followed you
  | 'vibelog_like' // Someone liked your vibelog
  | 'mini_vibelog_promoted' // Your comment was promoted to mini-vibelog
  | 'comment_promoted' // Your comment was promoted to full vibelog
  | 'system' // System notifications
  | 'vibe_thread_message'; // New message in a conversation

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Base Notification Interface
 */
export interface Notification {
  id: string;
  user_id: string; // Recipient of the notification
  type: NotificationType;
  priority: NotificationPriority;

  // Actor (who triggered the notification)
  actor_id: string | null;
  actor_username: string | null;
  actor_display_name: string | null;
  actor_avatar_url: string | null;

  // Content
  title: string;
  message: string;
  action_text: string | null; // "View Comment", "See Reply", etc.
  action_url: string | null; // Where to navigate on click

  // Related entities
  vibelog_id: string | null;
  comment_id: string | null;
  reply_id: string | null;

  // Metadata
  metadata: Record<string, unknown> | null; // Flexible data storage

  // State
  is_read: boolean;
  is_seen: boolean; // Seen in notification center (distinct from read)
  read_at: string | null;
  seen_at: string | null;

  created_at: string;
}

/**
 * Grouped notifications (e.g., "John and 5 others liked your vibelog")
 */
export interface GroupedNotification extends Notification {
  count: number; // Number of similar notifications
  actors: Array<{
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  }>;
  latest_actor: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

// ============================================================================
// NOTIFICATION PREFERENCES
// ============================================================================

export interface NotificationChannel {
  in_app: boolean; // Show in notification center
  email: boolean; // Send email
  push: boolean; // Push notification (future)
}

export interface NotificationPreferences {
  user_id: string;

  // Per-type preferences
  comment: NotificationChannel;
  reply: NotificationChannel;
  reaction: NotificationChannel;
  mention: NotificationChannel;
  follow: NotificationChannel;
  vibelog_like: NotificationChannel;
  mini_vibelog_promoted: NotificationChannel;
  comment_promoted: NotificationChannel;
  system: NotificationChannel;
  vibe_thread_message: NotificationChannel;

  // Grouping settings
  group_similar: boolean; // Group similar notifications
  group_window_minutes: number; // Time window for grouping (default: 60)

  // Quiet hours
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null; // "22:00"
  quiet_hours_end: string | null; // "08:00"

  // Frequency limits
  max_emails_per_day: number;
  digest_enabled: boolean; // Send daily/weekly digest instead
  digest_frequency: 'daily' | 'weekly';

  created_at: string;
  updated_at: string;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Request body for creating a notification (server-side)
 */
export interface CreateNotificationRequest {
  userId: string;
  type: NotificationType;
  priority?: NotificationPriority;

  actorId?: string;
  title: string;
  message: string;
  actionText?: string;
  actionUrl?: string;

  vibelogId?: string;
  commentId?: string;
  replyId?: string;

  metadata?: Record<string, unknown>;
}

/**
 * Request body for marking notifications as read
 */
export interface MarkNotificationsReadRequest {
  notificationIds: string[];
}

/**
 * Request body for updating notification preferences
 */
export interface UpdatePreferencesRequest {
  type?: NotificationType;
  channel?: Partial<NotificationChannel>;
  groupSimilar?: boolean;
  groupWindowMinutes?: number;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  maxEmailsPerDay?: number;
  digestEnabled?: boolean;
  digestFrequency?: 'daily' | 'weekly';
}

/**
 * Response from notifications list API
 */
export interface NotificationsListResponse {
  notifications: Notification[];
  unreadCount: number;
  hasMore: boolean;
  nextCursor?: string;
}

/**
 * Response from notification count API
 */
export interface NotificationCountResponse {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
}

// ============================================================================
// COMPONENT PROPS TYPES
// ============================================================================

/**
 * Props for NotificationCenter component
 */
export interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationClick?: (notification: Notification) => void;
}

/**
 * Props for NotificationBell component
 */
export interface NotificationBellProps {
  unreadCount: number;
  onClick: () => void;
}

/**
 * Props for NotificationItem component
 */
export interface NotificationItemProps {
  notification: Notification;
  onClick?: (notification: Notification) => void;
  onMarkRead?: (notificationId: string) => void;
  onDelete?: (notificationId: string) => void;
}

/**
 * Props for NotificationPreferences component
 */
export interface NotificationPreferencesProps {
  preferences: NotificationPreferences;
  onUpdate: (preferences: Partial<NotificationPreferences>) => void;
}

// ============================================================================
// DATABASE TYPES
// ============================================================================

/**
 * Raw database row type for notifications table
 */
export interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  priority: NotificationPriority;

  actor_id: string | null;
  actor_username: string | null;
  actor_display_name: string | null;
  actor_avatar_url: string | null;

  title: string;
  message: string;
  action_text: string | null;
  action_url: string | null;

  vibelog_id: string | null;
  comment_id: string | null;
  reply_id: string | null;

  metadata: Record<string, unknown> | null;

  is_read: boolean;
  is_seen: boolean;
  read_at: string | null;
  seen_at: string | null;

  created_at: string;
}

/**
 * Raw database row type for notification_preferences table
 */
export interface NotificationPreferencesRow {
  user_id: string;

  comment_in_app: boolean;
  comment_email: boolean;
  comment_push: boolean;

  reply_in_app: boolean;
  reply_email: boolean;
  reply_push: boolean;

  reaction_in_app: boolean;
  reaction_email: boolean;
  reaction_push: boolean;

  mention_in_app: boolean;
  mention_email: boolean;
  mention_push: boolean;

  follow_in_app: boolean;
  follow_email: boolean;
  follow_push: boolean;

  vibelog_like_in_app: boolean;
  vibelog_like_email: boolean;
  vibelog_like_push: boolean;

  mini_vibelog_promoted_in_app: boolean;
  mini_vibelog_promoted_email: boolean;
  mini_vibelog_promoted_push: boolean;

  comment_promoted_in_app: boolean;
  comment_promoted_email: boolean;
  comment_promoted_push: boolean;

  system_in_app: boolean;
  system_email: boolean;
  system_push: boolean;

  vibe_thread_message_in_app: boolean;
  vibe_thread_message_email: boolean;
  vibe_thread_message_push: boolean;

  group_similar: boolean;
  group_window_minutes: number;

  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;

  max_emails_per_day: number;
  digest_enabled: boolean;
  digest_frequency: 'daily' | 'weekly';

  created_at: string;
  updated_at: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Notification filter options
 */
export interface NotificationFilter {
  types?: NotificationType[];
  isRead?: boolean;
  isSeen?: boolean;
  priority?: NotificationPriority[];
  actorId?: string;
  vibelogId?: string;
  commentId?: string;
}

/**
 * Notification sort options
 */
export type NotificationSortOption = 'newest' | 'oldest' | 'priority';

/**
 * Pagination options for notifications
 */
export interface NotificationPagination {
  page: number;
  limit: number;
  sortBy: NotificationSortOption;
  filter?: NotificationFilter;
}

/**
 * Real-time notification event (for WebSocket/Supabase Realtime)
 */
export interface NotificationEvent {
  type: 'new' | 'read' | 'deleted';
  notification: Notification;
  timestamp: string;
}
