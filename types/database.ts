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

  // Video (user-uploaded or AI-generated)
  video_url?: string | null;
  video_duration?: number | null; // Duration in seconds
  video_width?: number | null; // Width in pixels
  video_height?: number | null; // Height in pixels
  video_source?: 'uploaded' | 'generated' | null; // Source of video
  video_uploaded_at?: string | null; // When user uploaded (null for AI)
  video_generation_status?: 'pending' | 'generating' | 'completed' | 'failed' | null;
  video_generation_error?: string | null;
  video_generated_at?: string | null; // When AI generated (null for uploaded)

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
