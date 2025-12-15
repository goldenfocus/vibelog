/**
 * Database Types for Vibelog
 *
 * Centralized type definitions for database tables and their relationships.
 * These types should match the Supabase schema.
 */

/**
 * Translation object for a single language
 */
export interface VibelogTranslation {
  title: string;
  content: string;
  seo_title?: string;
  seo_description?: string;
  tags?: string[];
  translated_at: string; // ISO timestamp
  translation_model: string; // e.g., "gpt-4o-mini"
}

/**
 * JSONB structure for storing multiple language translations
 * Key is ISO 639-1 language code (e.g., "es", "fr", "de")
 */
export interface VibelogTranslations {
  [languageCode: string]: VibelogTranslation;
}

/**
 * Vibelog author information (from profiles table)
 */
export interface VibelogAuthor {
  username: string;
  display_name: string;
  avatar_url: string | null;
}

/**
 * Main Vibelog type matching the database schema
 * Updated with multi-language support (Phase 1)
 */
export interface Vibelog {
  // Core identifiers
  id: string;
  user_id?: string; // Author's user ID (null for anonymous)

  // Content fields
  title: string;
  teaser: string;
  content: string;

  // SEO and routing
  slug?: string | null; // User-specific slug
  public_slug?: string | null; // For anonymous vibelogs

  // Media
  cover_image_url: string | null;
  audio_url?: string | null; // Original audio recording
  ai_audio_url?: string | null; // AI-generated narration audio
  transcript?: string | null; // Original transcript before AI enhancement

  // Video (camera captured or user uploaded)
  video_url?: string | null;
  video_duration?: number | null; // Duration in seconds
  video_width?: number | null; // Width in pixels
  video_height?: number | null; // Height in pixels
  video_source?: 'captured' | 'uploaded' | null; // Source: camera or file upload
  video_uploaded_at?: string | null; // When user uploaded/captured

  // Media type for music/video uploads
  media_type?: 'audio' | 'video' | null; // Type of uploaded media (null for standard voice vibelogs)

  // Timestamps
  created_at: string;
  published_at: string;

  // Metrics
  view_count: number;
  like_count: number;
  share_count: number;
  read_time: number;

  // Multi-language support (NEW - Phase 1)
  original_language?: string | null; // ISO 639-1 code (e.g., "fr", "en")
  detected_confidence?: number | null; // Whisper confidence (0-1)
  available_languages?: string[] | null; // Array of language codes
  translations?: VibelogTranslations | null; // JSONB object with translations

  // Author relationship
  author: VibelogAuthor;
}

/**
 * Supported languages for Vibelog
 * Based on the 6 official languages
 */
export const SUPPORTED_LANGUAGES = {
  en: { code: 'en', name: 'English', nativeName: 'English' },
  es: { code: 'es', name: 'Spanish', nativeName: 'Español' },
  fr: { code: 'fr', name: 'French', nativeName: 'Français' },
  de: { code: 'de', name: 'German', nativeName: 'Deutsch' },
  vi: { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  zh: { code: 'zh', name: 'Chinese', nativeName: '中文' },
} as const;

export type LanguageCode = keyof typeof SUPPORTED_LANGUAGES;

/**
 * Profile type (from profiles table)
 */
export interface Profile {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  header_image?: string | null;
  bio?: string | null;
  is_public: boolean;
  allow_search: boolean;
  created_at: string;
  updated_at: string;
  last_sign_in_at?: string | null;

  // Google OAuth fields
  google_name?: string | null;
  google_given_name?: string | null;
  google_family_name?: string | null;
  google_picture?: string | null;
  google_email?: string | null;
  google_verified_email?: boolean | null;
  google_locale?: string | null;

  // Provider info
  provider?: string | null;
  provider_id?: string | null;

  // Metrics
  total_vibelogs?: number;
}

/**
 * Helper type for database queries that include author information
 */
export interface VibelogWithAuthor extends Omit<Vibelog, 'author'> {
  profiles?: Profile | null;
}

/**
 * Type guard to check if a vibelog has translations for a specific language
 */
export function hasTranslation(vibelog: Vibelog, languageCode: string): boolean {
  return !!(
    vibelog.translations &&
    languageCode in vibelog.translations &&
    vibelog.translations[languageCode]
  );
}

/**
 * Get translation for a specific language, with fallback to original
 */
export function getVibelogContent(
  vibelog: Vibelog,
  languageCode: string
): {
  title: string;
  content: string;
  isTranslated: boolean;
  isOriginal: boolean;
} {
  // Check if this is the original language
  const isOriginal = vibelog.original_language === languageCode;

  // Check if translation exists
  if (hasTranslation(vibelog, languageCode)) {
    const translation = vibelog.translations![languageCode];
    return {
      title: translation.title,
      content: translation.content,
      isTranslated: true,
      isOriginal: false,
    };
  }

  // Fallback to original content
  return {
    title: vibelog.title,
    content: vibelog.content,
    isTranslated: false,
    isOriginal,
  };
}

/**
 * Get all available languages for a vibelog (original + translations)
 */
export function getAvailableLanguages(vibelog: Vibelog): LanguageCode[] {
  const languages: LanguageCode[] = [];

  // Add original language
  if (vibelog.original_language && vibelog.original_language in SUPPORTED_LANGUAGES) {
    languages.push(vibelog.original_language as LanguageCode);
  }

  // Add translated languages
  if (vibelog.available_languages) {
    vibelog.available_languages.forEach(lang => {
      if (lang in SUPPORTED_LANGUAGES && !languages.includes(lang as LanguageCode)) {
        languages.push(lang as LanguageCode);
      }
    });
  }

  return languages;
}

// =====================================================
// MESSAGING SYSTEM TYPES
// =====================================================

/**
 * Conversation types
 */
export type ConversationType = 'dm' | 'group' | 'ai';

/**
 * Participant roles in conversations
 */
export type ParticipantRole = 'owner' | 'admin' | 'member';

/**
 * Message content types
 */
export type MessageContentType = 'text' | 'image' | 'file' | 'voice' | 'video';

/**
 * Message delivery status
 */
export type MessageStatus = 'sent' | 'delivered' | 'read';

/**
 * User relationship types
 */
export type RelationshipType = 'block' | 'mute' | 'follow';

/**
 * Message attachment structure
 */
export interface MessageAttachment {
  type: string;
  url: string;
  name: string;
  size: number;
  mimeType?: string;
}

/**
 * Message metadata structure (extensible)
 */
export interface MessageMetadata {
  edited?: boolean;
  edited_at?: string;
  ai_generated?: boolean;
  vibe_scores?: {
    joy?: number;
    sadness?: number;
    anger?: number;
    fear?: number;
    surprise?: number;
  };
}

/**
 * Conversation table row
 */
export interface Conversation {
  id: string;
  type: ConversationType;
  title: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  ai_trainable: boolean;
  deleted_at: string | null;
}

/**
 * Conversation participant table row
 */
export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  role: ParticipantRole;
  is_muted: boolean;
  is_archived: boolean;
  is_pinned: boolean;
  last_read_message_id: string | null;
  last_read_at: string | null;
  joined_at: string;
  left_at: string | null;
}

/**
 * Message table row
 */
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  parent_message_id: string | null;
  thread_message_count: number;
  content: string;
  content_type: MessageContentType;
  attachments: MessageAttachment[];
  metadata: MessageMetadata;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  ai_trainable: boolean;
}

/**
 * Message status table row (read receipts)
 */
export interface MessageStatusRow {
  id: string;
  message_id: string;
  user_id: string;
  status: MessageStatus;
  updated_at: string;
}

/**
 * Message reaction table row
 */
export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

/**
 * User relationship table row
 */
export interface UserRelationship {
  id: string;
  user_id: string;
  target_user_id: string;
  relationship_type: RelationshipType;
  created_at: string;
}

/**
 * Enriched message with sender info and reactions
 */
export interface MessageWithDetails extends Message {
  sender: Profile | null;
  reactions: Array<{
    emoji: string;
    count: number;
    userIds: string[];
    hasReacted: boolean; // Current user has reacted with this emoji
  }>;
  status?: MessageStatus; // Current user's read status
}

/**
 * Enriched conversation with participants and last message
 */
export interface ConversationWithDetails extends Conversation {
  participants: Profile[];
  lastMessage: MessageWithDetails | null;
  unreadCount: number;
  isMuted: boolean;
  isArchived: boolean;
  isPinned: boolean;
}

/**
 * Typing event payload (for realtime broadcasts)
 */
export interface TypingEvent {
  conversationId: string;
  userId: string;
  isTyping: boolean;
  timestamp: string;
}

/**
 * Presence event payload (for online status)
 */
export interface PresenceEvent {
  userId: string;
  status: 'online' | 'offline';
  lastSeenAt: string;
}
