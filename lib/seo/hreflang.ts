/**
 * SEO utilities for generating hreflang alternate links
 *
 * This ensures Google (and other search engines) properly index
 * each language version of pages and show the correct language
 * to users based on their location/preferences.
 *
 * Also critical for AEO (Answer Engine Optimization) - AI agents
 * can clearly identify language variants from URL structure.
 */

export const SUPPORTED_LOCALES = ['en', 'vi', 'es', 'fr', 'de', 'zh'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://vibelog.io';

/**
 * Language metadata for each supported locale
 */
export const LOCALE_METADATA: Record<Locale, { name: string; nativeName: string; flag: string }> = {
  en: { name: 'English', nativeName: 'English', flag: '🇬🇧' },
  vi: { name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  es: { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  fr: { name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  de: { name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  zh: { name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
};

/**
 * Generate hreflang alternate links for a given path
 *
 * @param path - The path without locale prefix (e.g., '/community', '/@user/slug')
 * @param currentLocale - The current locale
 * @param options - Options for special handling
 * @returns Object mapping locale codes to full URLs
 *
 * @example
 * ```ts
 * const links = generateHreflangLinks('/community', 'en');
 * // Returns:
 * // {
 * //   'en': 'https://vibelog.io/en/community',
 * //   'vi': 'https://vibelog.io/vi/community',
 * //   'es': 'https://vibelog.io/es/community',
 * //   ...
 * //   'x-default': 'https://vibelog.io/en/community'
 * // }
 * ```
 */
export function generateHreflangLinks(
  path: string,
  _currentLocale: Locale = DEFAULT_LOCALE,
  options: { keepProfileClean?: boolean } = {}
): Record<string, string> {
  const links: Record<string, string> = {};

  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // Check if this is a profile URL (/@username only, not /@username/slug)
  const isProfileUrl = cleanPath.match(/^\/@[^/]+$/);

  // Generate URL for each locale
  SUPPORTED_LOCALES.forEach(locale => {
    // Keep profile URLs clean for sharing, but add locale to vibelog pages
    const localePath =
      options.keepProfileClean && isProfileUrl ? cleanPath : `/${locale}${cleanPath}`;
    links[locale] = `${BASE_URL}${localePath}`;
  });

  // Add x-default (points to English version with locale prefix, or clean profile URL)
  links['x-default'] =
    options.keepProfileClean && isProfileUrl
      ? `${BASE_URL}${cleanPath}`
      : `${BASE_URL}/en${cleanPath}`;

  return links;
}

/**
 * Generate canonical URL for a given path and locale
 *
 * @param path - The path without locale prefix
 * @param locale - The locale
 * @param options - Options for special handling
 * @returns Canonical URL
 *
 * @example
 * ```ts
 * generateCanonicalUrl('/community', 'vi'); // https://vibelog.io/vi/community
 * generateCanonicalUrl('/community', 'en'); // https://vibelog.io/en/community
 * generateCanonicalUrl('/@user', 'en', { keepProfileClean: true }); // https://vibelog.io/@user
 * ```
 */
export function generateCanonicalUrl(
  path: string,
  locale: Locale = DEFAULT_LOCALE,
  options: { keepProfileClean?: boolean } = {}
): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // Special case: Keep profile URLs clean for sharing
  if (options.keepProfileClean && cleanPath.match(/^\/@[^/]+$/)) {
    return `${BASE_URL}${cleanPath}`;
  }

  // All other URLs get explicit locale prefix (including English)
  const localePath = `/${locale}${cleanPath}`;
  return `${BASE_URL}${localePath}`;
}

/**
 * Get alternate locales (all locales except current)
 *
 * Used for OpenGraph og:locale:alternate tags
 *
 * @param currentLocale - The current locale
 * @returns Array of alternate locale codes
 */
export function getAlternateLocales(currentLocale: Locale): Locale[] {
  return SUPPORTED_LOCALES.filter(locale => locale !== currentLocale);
}

/**
 * Convert locale code to full language name
 *
 * @param locale - The locale code
 * @param useNativeName - Whether to return native name instead of English name
 * @returns Language name
 */
export function getLanguageName(locale: Locale, useNativeName: boolean = false): string {
  return useNativeName ? LOCALE_METADATA[locale].nativeName : LOCALE_METADATA[locale].name;
}

/**
 * Check if a locale is supported
 *
 * @param locale - The locale to check
 * @returns Whether the locale is supported
 */
export function isLocaleSupported(locale: string): locale is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(locale);
}

/**
 * Extract locale from a full URL path
 *
 * @param path - Full URL path (e.g., '/vi/community' or '/community')
 * @returns Locale if found, otherwise default locale
 */
export function extractLocaleFromPath(path: string): Locale {
  const segments = path.split('/').filter(Boolean);
  const firstSegment = segments[0];

  if (firstSegment && isLocaleSupported(firstSegment)) {
    return firstSegment;
  }

  return DEFAULT_LOCALE;
}

/**
 * Strip locale prefix from path
 *
 * @param path - Full path with potential locale prefix
 * @returns Path without locale prefix
 */
export function stripLocaleFromPath(path: string): string {
  const segments = path.split('/').filter(Boolean);
  const firstSegment = segments[0];

  // Check if first segment is a locale (including default locale 'en')
  if (firstSegment && isLocaleSupported(firstSegment)) {
    // Remove the locale prefix
    if (path === `/${firstSegment}`) {
      return '/';
    }
    if (path.startsWith(`/${firstSegment}/`)) {
      return path.slice(`/${firstSegment}`.length);
    }
  }

  return path;
}

/**
 * Add locale prefix to path
 *
 * @param path - Path without locale prefix
 * @param locale - Locale to add
 * @param options - Options for special handling
 * @returns Path with locale prefix
 *
 * @example
 * ```ts
 * addLocaleToPath('/community', 'en')  // '/en/community'
 * addLocaleToPath('/@user', 'en', { keepProfileClean: true })  // '/@user' (clean for sharing)
 * addLocaleToPath('/@user/slug', 'vi')  // '/vi/@user/slug' (vibelog pages need locale)
 * ```
 */
export function addLocaleToPath(
  path: string,
  locale: Locale,
  options: { keepProfileClean?: boolean } = {}
): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // Special case: Keep profile URLs clean for sharing (/@username only, not /@username/slug)
  if (options.keepProfileClean && cleanPath.match(/^\/@[^/]+$/)) {
    return cleanPath;
  }

  // All other URLs get explicit locale prefix (including English)
  return `/${locale}${cleanPath}`;
}
