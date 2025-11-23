/**
 * Messaging System TypeScript Types
 *
 * Type definitions for the voice-first, mobile-native messaging system
 */

import { Profile } from './database';

// =====================================================
// CORE TYPES
// =====================================================

export type ConversationType = 'dm' | 'group';
export type PresenceStatus = 'online' | 'offline' | 'away';

// =====================================================
// MEDIA ATTACHMENT
// =====================================================

export interface MediaAttachment {
  type: 'image' | 'video' | 'file';
  url: string;
  name: string;
  size: number;
  mime_type: string;
  thumbnail_url?: string;
}

// =====================================================
// VIBE SCORES (Emotion Analysis)
// =====================================================

export interface VibeScores {
  joy?: number;
  sadness?: number;
  anger?: number;
  fear?: number;
  surprise?: number;
  neutral?: number;
}

// =====================================================
// CONVERSATION
// =====================================================

export interface Conversation {
  id: string;
  type: ConversationType;
  title: string | null;
  description: string | null;
  avatar_url: string | null;
  created_by: string | null;
  ai_summary: string | null;
  last_message_id: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationParticipant {
  conversation_id: string;
  user_id: string;
  joined_at: string;
  last_read_message_id: string | null;
  last_read_at: string | null;
  is_muted: boolean;
  is_archived: boolean;
  notifications_enabled: boolean;
  is_typing: boolean;
  typing_updated_at: string | null;
}

/**
 * Enriched conversation with participants, last message, and unread count
 */
export interface ConversationWithDetails extends Conversation {
  participants: Profile[];
  last_message: MessageWithDetails | null;
  unread_count: number;
  is_muted: boolean;
  is_archived: boolean;
  is_typing: boolean; // Any participant typing

  // For DMs: the other user
  other_user?: Profile;
}

// =====================================================
// MESSAGE
// =====================================================

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string | null;

  // Content (multi-modal)
  content: string | null;
  audio_url: string | null;
  audio_duration: number | null; // milliseconds
  video_url: string | null;
  attachments: MediaAttachment[];

  // AI enhancement
  transcript: string | null; // Whisper auto-transcription
  ai_enhanced_content: string | null; // GPT-4o polished
  ai_summary: string | null; // For long voice messages
  vibe_scores: VibeScores | null;
  primary_vibe: string | null;

  // Threading
  reply_to_message_id: string | null;

  // State
  is_deleted: boolean;
  deleted_for_everyone: boolean;
  edited_at: string | null;

  created_at: string;
  updated_at: string;
}

/**
 * Enriched message with sender profile, reply context, and read status
 */
export interface MessageWithDetails extends Message {
  sender: Profile | null;
  reply_to?: MessageWithDetails;
  reads: MessageRead[];
  is_read: boolean; // Current user has read this message
  read_by_count: number; // Number of participants who read
}

// =====================================================
// MESSAGE READ (Read Receipt)
// =====================================================

export interface MessageRead {
  message_id: string;
  user_id: string;
  read_at: string;
}

// =====================================================
// FOLLOW
// =====================================================

export interface Follow {
  follower_id: string;
  following_id: string;
  created_at: string;
}

// =====================================================
// PRESENCE
// =====================================================

export interface UserPresence {
  user_id: string;
  status: PresenceStatus;
  last_seen_at: string;
  updated_at: string;
}

// =====================================================
// API REQUEST/RESPONSE TYPES
// =====================================================

/**
 * Create conversation request
 */
export interface CreateConversationRequest {
  type?: ConversationType;
  participant_id?: string; // For DMs
  participant_ids?: string[]; // For groups
  title?: string; // Required for groups
  description?: string;
}

/**
 * Send message request
 */
export interface SendMessageRequest {
  content?: string;
  audio_url?: string;
  audio_duration?: number;
  video_url?: string;
  attachments?: MediaAttachment[];
  reply_to_message_id?: string;
}

/**
 * Get messages response (paginated)
 */
export interface GetMessagesResponse {
  messages: MessageWithDetails[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Get conversations response
 */
export interface GetConversationsResponse {
  conversations: ConversationWithDetails[];
}

/**
 * Unread count per conversation
 */
export interface UnreadCount {
  conversation_id: string;
  unread_count: number;
}

// =====================================================
// REAL-TIME EVENT TYPES
// =====================================================

/**
 * Typing indicator event (broadcast via Supabase Realtime)
 */
export interface TypingEvent {
  conversation_id: string;
  user_id: string;
  is_typing: boolean;
  timestamp: string;
}

/**
 * Presence event (Supabase Presence API)
 */
export interface PresenceEventPayload {
  user_id: string;
  status: PresenceStatus;
  timestamp: string;
}

/**
 * New message event (postgres_changes)
 */
export interface NewMessageEvent {
  conversation_id: string;
  message: MessageWithDetails;
}

/**
 * Read receipt event (postgres_changes)
 */
export interface ReadReceiptEvent {
  message_id: string;
  user_id: string;
  read_at: string;
}

// =====================================================
// UI STATE TYPES
// =====================================================

/**
 * Message input mode
 */
export type MessageInputMode = 'text' | 'voice' | 'video';

/**
 * Conversation list filter
 */
export type ConversationFilter = 'all' | 'unread' | 'archived' | 'muted';

/**
 * Message bubble alignment
 */
export type MessageAlignment = 'left' | 'right';

/**
 * Voice playback speed
 */
export type PlaybackSpeed = 1 | 1.5 | 2;

// =====================================================
// HELPER TYPES
// =====================================================

/**
 * Type guard to check if message has voice content
 */
export function isVoiceMessage(message: Message): boolean {
  return !!message.audio_url;
}

/**
 * Type guard to check if message has video content
 */
export function isVideoMessage(message: Message): boolean {
  return !!message.video_url;
}

/**
 * Type guard to check if message has text content
 */
export function isTextMessage(message: Message): boolean {
  return !!message.content;
}

/**
 * Type guard to check if message is a reply
 */
export function isReplyMessage(message: Message): boolean {
  return !!message.reply_to_message_id;
}

/**
 * Get message content type for display
 */
export function getMessageContentType(message: Message): string {
  if (message.video_url) {
    return 'Video';
  }
  if (message.audio_url) {
    return 'Voice';
  }
  if (message.content) {
    return 'Text';
  }
  if (message.attachments.length > 0) {
    return 'Media';
  }
  return 'Message';
}

/**
 * Format message preview (for conversation list)
 */
export function getMessagePreview(message: Message, maxLength = 100): string {
  if (message.content) {
    return message.content.length > maxLength
      ? message.content.substring(0, maxLength) + '...'
      : message.content;
  }

  if (message.audio_url) {
    return '🎤 Voice message';
  }

  if (message.video_url) {
    return '🎥 Video message';
  }

  if (message.attachments.length > 0) {
    return `📎 ${message.attachments.length} attachment${message.attachments.length > 1 ? 's' : ''}`;
  }

  return 'Message';
}

/**
 * Format audio duration (milliseconds to MM:SS)
 */
export function formatAudioDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format message timestamp
 */
export function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();
  const isYesterday =
    new Date(now.setDate(now.getDate() - 1)).toDateString() === date.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  if (isYesterday) {
    return 'Yesterday';
  }

  const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/**
 * Get conversation title for DMs (uses other user's name)
 */
export function getConversationTitle(
  conversation: ConversationWithDetails,
  currentUserId: string
): string {
  if (conversation.type === 'group') {
    return conversation.title || 'Group Chat';
  }

  // For DMs, use other user's display name
  const otherUser = conversation.participants.find(p => p.id !== currentUserId);
  return otherUser?.display_name || 'Unknown User';
}

/**
 * Get conversation avatar for DMs (uses other user's avatar)
 */
export function getConversationAvatar(
  conversation: ConversationWithDetails,
  currentUserId: string
): string | null {
  if (conversation.type === 'group') {
    return conversation.avatar_url;
  }

  // For DMs, use other user's avatar
  const otherUser = conversation.participants.find(p => p.id !== currentUserId);
  return otherUser?.avatar_url || null;
}
