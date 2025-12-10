/**
 * Breadcrumb & WebPage Schema Utilities
 *
 * Centralized system for generating breadcrumb navigation and WebPage
 * structured data across all VibeLog pages.
 *
 * ## Architecture
 *
 * This module provides:
 * 1. **BreadcrumbList** - Navigation path for any page
 * 2. **WebPage** (or subtypes) - Page identity and relationship to mainEntity
 *
 * ## Page Type Mapping
 *
 * | Route Pattern | WebPage Type | mainEntity |
 * |---------------|--------------|------------|
 * | / | WebSite | - (handled by global schema) |
 * | /[username] | ProfilePage | Person |
 * | /[username]/[slug] | WebPage | Article |
 * | /[username]/[slug]/original | WebPage | AudioObject |
 * | /community | CollectionPage | ItemList |
 * | /people | CollectionPage | ItemList |
 * | /about | AboutPage | Organization |
 * | /faq | FAQPage | - |
 * | /pricing | WebPage | - |
 *
 * ## Usage
 *
 * ```tsx
 * import { generateBreadcrumbs, generateWebPageSchema } from '@/lib/seo/breadcrumb-schema';
 *
 * // Generate breadcrumbs for a vibelog page
 * const breadcrumbs = generateBreadcrumbs({
 *   path: '/en/@johndoe/my-vibelog',
 *   locale: 'en',
 *   items: [
 *     { name: 'Home', path: '/' },
 *     { name: 'John Doe', path: '/@johndoe' },
 *     { name: 'My Vibelog', path: '/@johndoe/my-vibelog' },
 *   ],
 * });
 * ```
 *
 * @module lib/seo/breadcrumb-schema
 */

import { VIBELOG_IDENTITY } from './global-schema';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Single breadcrumb item
 */
export interface BreadcrumbItem {
  /** Human-readable name */
  name: string;
  /** Path relative to base URL (e.g., '/@johndoe') */
  path: string;
}

/**
 * Options for generating breadcrumbs
 */
export interface BreadcrumbOptions {
  /** Current page path (without base URL) */
  path: string;
  /** Current locale (optional, will be stripped from URLs) */
  locale?: string;
  /** Breadcrumb items from root to current page */
  items: BreadcrumbItem[];
}

/**
 * WebPage schema type options
 */
export type WebPageType =
  | 'WebPage'
  | 'ProfilePage'
  | 'CollectionPage'
  | 'AboutPage'
  | 'FAQPage'
  | 'ContactPage'
  | 'ItemPage'
  | 'SearchResultsPage';

/**
 * Options for generating WebPage schema
 */
export interface WebPageOptions {
  /** Page type (defaults to 'WebPage') */
  type?: WebPageType;
  /** Page URL path */
  path: string;
  /** Locale */
  locale?: string;
  /** Page title */
  name: string;
  /** Page description */
  description?: string;
  /** Date page was first published/created */
  datePublished?: string;
  /** Date page was last modified */
  dateModified?: string;
  /** Reference to main entity @id (e.g., 'https://vibelog.io/@user#person') */
  mainEntityId?: string;
  /** Inline main entity (alternative to mainEntityId) */
  mainEntity?: Record<string, unknown>;
  /** Primary image URL */
  primaryImageUrl?: string;
  /** Breadcrumb items for this page */
  breadcrumbs?: BreadcrumbItem[];
  /** In which language is the page */
  inLanguage?: string;
  /** Is the content free to access */
  isAccessibleForFree?: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Build full URL from path
 */
function buildUrl(path: string, locale?: string): string {
  const base = VIBELOG_IDENTITY.url;

  // Normalize path
  let normalizedPath = path.startsWith('/') ? path : `/${path}`;

  // Add locale prefix if provided and not 'en' (default)
  if (locale && locale !== 'en' && !normalizedPath.startsWith(`/${locale}`)) {
    normalizedPath = `/${locale}${normalizedPath}`;
  }

  return `${base}${normalizedPath}`;
}

/**
 * Strip locale from path for cleaner canonical URLs
 */
function stripLocale(path: string, locale?: string): string {
  if (!locale) return path;
  const localePrefix = `/${locale}`;
  if (path.startsWith(localePrefix)) {
    return path.slice(localePrefix.length) || '/';
  }
  return path;
}

// =============================================================================
// BREADCRUMB GENERATORS
// =============================================================================

/**
 * Generate BreadcrumbList JSON-LD schema
 *
 * Creates a structured breadcrumb trail that helps search engines
 * understand page hierarchy and enables breadcrumb rich snippets.
 */
export function generateBreadcrumbs(options: BreadcrumbOptions) {
  const { items, locale } = options;

  const itemListElement = items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: buildUrl(item.path, locale),
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement,
  };
}

/**
 * Generate breadcrumb data for both UI and JSON-LD
 *
 * Returns both display-friendly data and schema markup.
 */
export function generateBreadcrumbData(options: BreadcrumbOptions) {
  const { items, locale } = options;

  // UI-friendly data (for rendering breadcrumb components)
  const uiData = items.map((item, index) => ({
    name: item.name,
    href: buildUrl(item.path, locale),
    isLast: index === items.length - 1,
  }));

  // JSON-LD schema
  const schema = generateBreadcrumbs(options);

  return { uiData, schema };
}

// =============================================================================
// WEBPAGE SCHEMA GENERATORS
// =============================================================================

/**
 * Generate WebPage (or subtype) JSON-LD schema
 *
 * Describes the page itself and its relationship to other entities.
 */
export function generateWebPageSchema(options: WebPageOptions) {
  const {
    type = 'WebPage',
    path,
    locale,
    name,
    description,
    datePublished,
    dateModified,
    mainEntityId,
    mainEntity,
    primaryImageUrl,
    breadcrumbs,
    inLanguage,
    isAccessibleForFree = true,
  } = options;

  const pageUrl = buildUrl(path, locale);

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': type,
    '@id': pageUrl,
    url: pageUrl,
    name,
    isPartOf: {
      '@id': `${VIBELOG_IDENTITY.url}/#website`,
    },
    inLanguage: inLanguage || locale || 'en',
    isAccessibleForFree,
  };

  // Optional fields
  if (description) {
    schema.description = description;
  }

  if (datePublished) {
    schema.datePublished = datePublished;
  }

  if (dateModified) {
    schema.dateModified = dateModified;
  }

  if (primaryImageUrl) {
    schema.primaryImageOfPage = {
      '@type': 'ImageObject',
      url: primaryImageUrl,
    };
  }

  // Main entity reference
  if (mainEntityId) {
    schema.mainEntity = { '@id': mainEntityId };
  } else if (mainEntity) {
    schema.mainEntity = mainEntity;
  }

  // Breadcrumbs reference
  if (breadcrumbs && breadcrumbs.length > 0) {
    schema.breadcrumb = generateBreadcrumbs({
      path,
      locale,
      items: breadcrumbs,
    });
  }

  return schema;
}

// =============================================================================
// PRE-BUILT PAGE SCHEMAS
// =============================================================================

/**
 * Generate schema for the home page
 */
export function generateHomePageSchema(locale?: string) {
  return generateWebPageSchema({
    type: 'WebPage',
    path: '/',
    locale,
    name: 'VibeLog - Transform Your Voice Into Stories',
    description: VIBELOG_IDENTITY.description,
    primaryImageUrl: VIBELOG_IDENTITY.logo,
    breadcrumbs: [{ name: 'Home', path: '/' }],
  });
}

/**
 * Generate schema for the community/explore page
 */
export function generateCommunityPageSchema(options: {
  locale?: string;
  itemCount?: number;
}) {
  const { locale, itemCount } = options;

  return generateWebPageSchema({
    type: 'CollectionPage',
    path: '/community',
    locale,
    name: 'Community - Discover Vibelogs',
    description: 'Explore voice-to-text stories from creators around the world.',
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Community', path: '/community' },
    ],
    mainEntity: itemCount
      ? {
          '@type': 'ItemList',
          numberOfItems: itemCount,
          itemListElement: {
            '@type': 'ListItem',
            item: { '@type': 'Article' },
          },
        }
      : undefined,
  });
}

/**
 * Generate schema for the people directory page
 */
export function generatePeoplePageSchema(options: {
  locale?: string;
  creatorCount?: number;
}) {
  const { locale, creatorCount } = options;

  return generateWebPageSchema({
    type: 'CollectionPage',
    path: '/people',
    locale,
    name: 'People - Discover Creators',
    description: 'Find and follow creators sharing their voice on VibeLog.',
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'People', path: '/people' },
    ],
    mainEntity: creatorCount
      ? {
          '@type': 'ItemList',
          numberOfItems: creatorCount,
          itemListElement: {
            '@type': 'ListItem',
            item: { '@type': 'Person' },
          },
        }
      : undefined,
  });
}

/**
 * Generate schema for the about page
 */
export function generateAboutPageSchema(locale?: string) {
  return generateWebPageSchema({
    type: 'AboutPage',
    path: '/about',
    locale,
    name: 'About VibeLog',
    description:
      'Learn about VibeLog, the voice-to-publish platform that transforms spoken thoughts into beautiful stories.',
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'About', path: '/about' },
    ],
    mainEntityId: `${VIBELOG_IDENTITY.url}/#organization`,
  });
}

/**
 * Generate schema for the pricing page
 */
export function generatePricingPageSchema(locale?: string) {
  return generateWebPageSchema({
    type: 'WebPage',
    path: '/pricing',
    locale,
    name: 'Pricing - VibeLog',
    description: 'VibeLog pricing plans and features. Free to use.',
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Pricing', path: '/pricing' },
    ],
  });
}

/**
 * Generate schema for the FAQ page
 */
export function generateFAQPageSchema(locale?: string) {
  return generateWebPageSchema({
    type: 'FAQPage',
    path: '/faq',
    locale,
    name: 'FAQ - VibeLog',
    description: 'Frequently asked questions about VibeLog.',
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'FAQ', path: '/faq' },
    ],
  });
}

/**
 * Generate breadcrumbs for a profile page
 */
export function generateProfileBreadcrumbs(options: {
  username: string;
  displayName: string;
  locale?: string;
}) {
  const { username, displayName, locale } = options;

  return generateBreadcrumbs({
    path: `/@${username}`,
    locale,
    items: [
      { name: 'Home', path: '/' },
      { name: displayName, path: `/@${username}` },
    ],
  });
}

/**
 * Generate breadcrumbs for an original recording page
 */
export function generateOriginalRecordingBreadcrumbs(options: {
  username: string;
  displayName: string;
  slug: string;
  title: string;
  locale?: string;
}) {
  const { username, displayName, slug, title, locale } = options;

  return generateBreadcrumbs({
    path: `/@${username}/${slug}/original`,
    locale,
    items: [
      { name: 'Home', path: '/' },
      { name: displayName, path: `/@${username}` },
      { name: title, path: `/@${username}/${slug}` },
      { name: 'Original Recording', path: `/@${username}/${slug}/original` },
    ],
  });
}

// =============================================================================
// COMBINED SCHEMA HELPER
// =============================================================================

/**
 * Generate combined page schemas (WebPage + BreadcrumbList)
 *
 * Returns a graph containing both schemas for clean injection.
 */
export function generatePageSchemas(options: WebPageOptions) {
  const webPageSchema = generateWebPageSchema(options);

  // If breadcrumbs are included, they're already in the WebPage schema
  // Return just the WebPage schema
  return webPageSchema;
}

/**
 * Generate schemas as JSON string for direct injection
 */
export function getPageSchemasJSON(options: WebPageOptions): string {
  return JSON.stringify(generatePageSchemas(options));
}
