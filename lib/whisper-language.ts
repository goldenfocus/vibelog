/**
 * Whisper Language Code Utility
 *
 * Converts Whisper's full language name response to ISO 639-1 codes.
 * This is a standalone module with no dependencies to avoid bundler issues.
 */

/**
 * Maps Whisper's full language name response to ISO 639-1 code.
 */
const WHISPER_LANGUAGE_TO_ISO: Record<string, string> = {
  // Primary supported languages
  english: 'en',
  spanish: 'es',
  french: 'fr',
  german: 'de',
  vietnamese: 'vi',
  chinese: 'zh',
  // Other common languages
  afrikaans: 'af',
  arabic: 'ar',
  armenian: 'hy',
  azerbaijani: 'az',
  belarusian: 'be',
  bosnian: 'bs',
  bulgarian: 'bg',
  catalan: 'ca',
  croatian: 'hr',
  czech: 'cs',
  danish: 'da',
  dutch: 'nl',
  estonian: 'et',
  finnish: 'fi',
  galician: 'gl',
  greek: 'el',
  hebrew: 'he',
  hindi: 'hi',
  hungarian: 'hu',
  icelandic: 'is',
  indonesian: 'id',
  italian: 'it',
  japanese: 'ja',
  kannada: 'kn',
  kazakh: 'kk',
  korean: 'ko',
  latvian: 'lv',
  lithuanian: 'lt',
  macedonian: 'mk',
  malay: 'ms',
  marathi: 'mr',
  maori: 'mi',
  nepali: 'ne',
  norwegian: 'no',
  persian: 'fa',
  polish: 'pl',
  portuguese: 'pt',
  romanian: 'ro',
  russian: 'ru',
  serbian: 'sr',
  slovak: 'sk',
  slovenian: 'sl',
  swahili: 'sw',
  swedish: 'sv',
  tagalog: 'tl',
  tamil: 'ta',
  thai: 'th',
  turkish: 'tr',
  ukrainian: 'uk',
  urdu: 'ur',
  welsh: 'cy',
};

/**
 * Convert Whisper's language response to ISO 639-1 code.
 *
 * @param whisperLanguage - Full language name from Whisper (e.g., "english", "french")
 * @returns ISO 639-1 code (e.g., "en", "fr"), defaults to "en" if unknown
 */
export function whisperLanguageToISO(whisperLanguage: string | undefined | null): string {
  if (!whisperLanguage) {
    return 'en';
  }

  const normalized = whisperLanguage.toLowerCase().trim();

  // If it's already an ISO 639-1 code (2 lowercase letters), return it
  if (/^[a-z]{2}$/.test(normalized)) {
    return normalized;
  }

  // Map full language name to ISO code
  return WHISPER_LANGUAGE_TO_ISO[normalized] || 'en';
}
