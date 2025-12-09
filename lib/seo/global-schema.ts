/**
 * Global Schema Markup for VibeLog.io
 *
 * This module provides the platform-wide structured data that identifies
 * VibeLog.io to search engines and AI systems. It should be injected in
 * the root layout so every page inherits the global identity.
 *
 * ## Architecture Overview
 *
 * VibeLog uses a layered schema approach:
 *
 * 1. **Global Layer** (this file) - Platform identity
 *    - Organization: Who operates the site
 *    - WebSite: What the site is + search capability
 *    - WebApplication: App features and pricing
 *    - Injected in: `app/[locale]/layout.tsx`
 *
 * 2. **Page-Specific Layer** - Content-specific schemas
 *    - ProfilePage + Person: Creator profiles (`app/[locale]/[username]/page.tsx`)
 *    - BlogPosting + AudioObject: Vibelog posts (`app/[locale]/[username]/[slug]/page.tsx`)
 *    - AudioObject: Original recordings (`app/[locale]/[username]/[slug]/original/page.tsx`)
 *    - Comment: Response pages (`app/[locale]/c/[slug]/page.tsx`)
 *
 * ## Usage
 *
 * ```tsx
 * import { getGlobalSchemas } from '@/lib/seo/global-schema';
 *
 * // In layout.tsx:
 * <script
 *   type="application/ld+json"
 *   dangerouslySetInnerHTML={{ __html: JSON.stringify(getGlobalSchemas()) }}
 * />
 * ```
 *
 * ## Validation
 *
 * Test schemas with:
 * - Google Rich Results Test: https://search.google.com/test/rich-results
 * - Schema.org Validator: https://validator.schema.org/
 *
 * @module lib/seo/global-schema
 */

// =============================================================================
// CONSTANTS
// =============================================================================

export const VIBELOG_IDENTITY = {
  name: 'VibeLog',
  legalName: 'VibeLog',
  url: 'https://vibelog.io',
  logo: 'https://vibelog.io/og-image.png',
  description:
    'Transform your voice into polished stories in seconds. Create and publish content naturally with AI-powered voice technology.',
  slogan: 'Vibe → Share Everywhere',
  foundingDate: '2024',
  socialProfiles: {
    twitter: 'https://twitter.com/vibelog_io',
  },
} as const;

// =============================================================================
// SCHEMA GENERATORS
// =============================================================================

/**
 * Organization Schema
 *
 * Identifies VibeLog as an entity. This helps Google build a knowledge
 * panel and associate all content with the brand.
 *
 * @see https://schema.org/Organization
 */
export function getOrganizationSchema() {
  return {
    '@type': 'Organization',
    '@id': `${VIBELOG_IDENTITY.url}/#organization`,
    name: VIBELOG_IDENTITY.name,
    legalName: VIBELOG_IDENTITY.legalName,
    url: VIBELOG_IDENTITY.url,
    logo: {
      '@type': 'ImageObject',
      '@id': `${VIBELOG_IDENTITY.url}/#logo`,
      url: VIBELOG_IDENTITY.logo,
      contentUrl: VIBELOG_IDENTITY.logo,
      caption: VIBELOG_IDENTITY.name,
    },
    image: {
      '@id': `${VIBELOG_IDENTITY.url}/#logo`,
    },
    description: VIBELOG_IDENTITY.description,
    slogan: VIBELOG_IDENTITY.slogan,
    foundingDate: VIBELOG_IDENTITY.foundingDate,
    sameAs: Object.values(VIBELOG_IDENTITY.socialProfiles),
  };
}

/**
 * WebSite Schema
 *
 * Describes the website itself and enables sitelinks search box in SERPs.
 * The SearchAction allows users to search VibeLog directly from Google.
 *
 * @see https://schema.org/WebSite
 */
export function getWebSiteSchema() {
  return {
    '@type': 'WebSite',
    '@id': `${VIBELOG_IDENTITY.url}/#website`,
    url: VIBELOG_IDENTITY.url,
    name: VIBELOG_IDENTITY.name,
    description: VIBELOG_IDENTITY.description,
    publisher: {
      '@id': `${VIBELOG_IDENTITY.url}/#organization`,
    },
    inLanguage: ['en', 'vi', 'es', 'fr', 'de', 'zh'],
    // Enable Google Sitelinks Search Box
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${VIBELOG_IDENTITY.url}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * WebApplication Schema
 *
 * Describes VibeLog as a web application with its features and pricing.
 * This helps app directories and AI assistants understand capabilities.
 *
 * @see https://schema.org/WebApplication
 */
export function getWebApplicationSchema() {
  return {
    '@type': 'WebApplication',
    '@id': `${VIBELOG_IDENTITY.url}/#app`,
    name: VIBELOG_IDENTITY.name,
    url: VIBELOG_IDENTITY.url,
    description: VIBELOG_IDENTITY.description,
    applicationCategory: 'ContentCreationApplication',
    operatingSystem: 'Web',
    browserRequirements: 'Requires JavaScript. Requires a modern browser.',
    // Features list for AI discoverability
    featureList: [
      'Voice to text transcription',
      'AI content enhancement',
      'Multi-language support',
      'Audio recording and playback',
      'AI video generation',
      'Multi-platform publishing',
      'Creator profiles and channels',
      'Social interactions (likes, comments, shares)',
    ],
    // Pricing
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Free to use',
    },
    // Link to the organization
    publisher: {
      '@id': `${VIBELOG_IDENTITY.url}/#organization`,
    },
    // Aggregate rating placeholder (can be populated with real data later)
    // aggregateRating: {
    //   '@type': 'AggregateRating',
    //   ratingValue: '4.8',
    //   ratingCount: '150',
    // },
  };
}

// =============================================================================
// MAIN EXPORT
// =============================================================================

/**
 * Get all global schemas as a single JSON-LD graph
 *
 * Uses @graph to combine multiple schemas into one script tag,
 * which is cleaner and allows cross-referencing via @id.
 *
 * @returns Combined schema object ready for JSON.stringify()
 */
export function getGlobalSchemas() {
  return {
    '@context': 'https://schema.org',
    '@graph': [getOrganizationSchema(), getWebSiteSchema(), getWebApplicationSchema()],
  };
}

/**
 * Get global schemas as a JSON string
 *
 * Convenience function for direct injection into script tags.
 *
 * @returns Stringified JSON-LD
 */
export function getGlobalSchemasJSON(): string {
  return JSON.stringify(getGlobalSchemas());
}
