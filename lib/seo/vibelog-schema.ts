/**
 * Vibelog Schema Markup
 *
 * Generates JSON-LD structured data for individual vibelog posts.
 * Vibelogs can contain text, audio, video, or combinations thereof.
 *
 * ## Schema Strategy
 *
 * We use `Article` as the base type (more universal than BlogPosting) with
 * embedded media objects:
 * - AudioObject: For original voice recordings
 * - VideoObject: For AI-generated or uploaded videos
 *
 * All schemas use @id references to link entities:
 * - Author links to Person schema on profile pages
 * - Publisher links to global Organization schema
 *
 * ## Usage
 *
 * ```tsx
 * import { generateVibelogSchema } from '@/lib/seo/vibelog-schema';
 *
 * const schema = generateVibelogSchema({
 *   vibelog: vibelogData,
 *   author: authorData,
 *   locale: 'en',
 * });
 *
 * <script
 *   type="application/ld+json"
 *   dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
 * />
 * ```
 *
 * @module lib/seo/vibelog-schema
 */

import { VIBELOG_IDENTITY } from './global-schema';

// =============================================================================
// TYPES
// =============================================================================

export interface VibelogSchemaInput {
  id: string;
  title: string;
  slug: string;
  content: string;
  teaser?: string | null;
  transcript?: string | null;
  audio_url?: string | null;
  ai_audio_url?: string | null;
  video_url?: string | null;
  cover_image_url?: string | null;
  published_at: string;
  created_at: string;
  read_time?: number | null;
  word_count?: number | null;
  tags?: string[] | null;
  like_count?: number | null;
  share_count?: number | null;
  comment_count?: number | null;
  view_count?: number | null;
  // SEO fields
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string[] | null;
}

export interface AuthorSchemaInput {
  username: string;
  display_name: string;
  avatar_url?: string | null;
}

export interface VibelogSchemaOptions {
  vibelog: VibelogSchemaInput;
  author: AuthorSchemaInput;
  locale?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Generate canonical URL for a vibelog
 */
function getVibelogUrl(username: string, slug: string, locale?: string): string {
  const base = VIBELOG_IDENTITY.url;
  if (locale && locale !== 'en') {
    return `${base}/${locale}/@${username}/${slug}`;
  }
  return `${base}/@${username}/${slug}`;
}

/**
 * Generate profile URL for author linking
 */
function getAuthorUrl(username: string): string {
  return `${VIBELOG_IDENTITY.url}/@${username}`;
}

/**
 * Extract a clean description from content
 */
function extractDescription(
  teaser: string | null | undefined,
  content: string,
  maxLength = 160
): string {
  if (teaser) return teaser.substring(0, maxLength);

  // Find first non-heading paragraph
  const paragraph = content
    .split('\n\n')
    .find(p => p.trim() && !p.startsWith('#'));

  if (paragraph) {
    // Strip markdown formatting
    const clean = paragraph
      .replace(/[*_~`]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .trim();
    return clean.substring(0, maxLength);
  }

  return '';
}

// =============================================================================
// SCHEMA GENERATORS
// =============================================================================

/**
 * Generate Person schema for article author
 * Links to the full Person schema on their profile page via @id
 */
function generateAuthorSchema(author: AuthorSchemaInput) {
  const authorUrl = getAuthorUrl(author.username);

  const schema: Record<string, unknown> = {
    '@type': 'Person',
    '@id': `${authorUrl}#person`,
    name: author.display_name,
    url: authorUrl,
  };

  if (author.avatar_url) {
    schema.image = author.avatar_url;
  }

  return schema;
}

/**
 * Generate AudioObject schema for voice recordings
 */
function generateAudioSchema(
  vibelog: VibelogSchemaInput,
  author: AuthorSchemaInput
): Record<string, unknown> | null {
  if (!vibelog.audio_url) return null;

  const schema: Record<string, unknown> = {
    '@type': 'AudioObject',
    '@id': `${getVibelogUrl(author.username, vibelog.slug)}#audio`,
    name: `Original voice recording: ${vibelog.title}`,
    contentUrl: vibelog.audio_url,
    encodingFormat: 'audio/webm',
    inLanguage: 'en', // Could be dynamic based on original_language
  };

  // Add transcript if available (great for accessibility + SEO)
  if (vibelog.transcript) {
    schema.transcript = vibelog.transcript;
  }

  // Add upload date
  schema.uploadDate = vibelog.published_at;

  return schema;
}

/**
 * Generate VideoObject schema for videos
 */
function generateVideoSchema(
  vibelog: VibelogSchemaInput,
  author: AuthorSchemaInput
): Record<string, unknown> | null {
  if (!vibelog.video_url) return null;

  const vibelogUrl = getVibelogUrl(author.username, vibelog.slug);

  const schema: Record<string, unknown> = {
    '@type': 'VideoObject',
    '@id': `${vibelogUrl}#video`,
    name: vibelog.title,
    description: extractDescription(vibelog.teaser, vibelog.content),
    contentUrl: vibelog.video_url,
    uploadDate: vibelog.published_at,
    // Thumbnail
    thumbnailUrl: vibelog.cover_image_url || `${VIBELOG_IDENTITY.url}/og-image.png`,
    // Embed URL (same as content for now)
    embedUrl: vibelog.video_url,
  };

  // Add transcript if available
  if (vibelog.transcript) {
    schema.transcript = vibelog.transcript;
  }

  return schema;
}

/**
 * Generate ImageObject schema for cover images
 */
function generateImageSchema(
  vibelog: VibelogSchemaInput
): Record<string, unknown> {
  const imageUrl = vibelog.cover_image_url || `${VIBELOG_IDENTITY.url}/og-image.png`;

  return {
    '@type': 'ImageObject',
    url: imageUrl,
    contentUrl: imageUrl,
  };
}

/**
 * Generate interaction statistics
 */
function generateInteractionStats(vibelog: VibelogSchemaInput): Record<string, unknown>[] {
  const stats: Record<string, unknown>[] = [];

  if (vibelog.view_count && vibelog.view_count > 0) {
    stats.push({
      '@type': 'InteractionCounter',
      interactionType: { '@type': 'ReadAction' },
      userInteractionCount: vibelog.view_count,
    });
  }

  if (vibelog.like_count && vibelog.like_count > 0) {
    stats.push({
      '@type': 'InteractionCounter',
      interactionType: { '@type': 'LikeAction' },
      userInteractionCount: vibelog.like_count,
    });
  }

  if (vibelog.share_count && vibelog.share_count > 0) {
    stats.push({
      '@type': 'InteractionCounter',
      interactionType: { '@type': 'ShareAction' },
      userInteractionCount: vibelog.share_count,
    });
  }

  if (vibelog.comment_count && vibelog.comment_count > 0) {
    stats.push({
      '@type': 'InteractionCounter',
      interactionType: { '@type': 'CommentAction' },
      userInteractionCount: vibelog.comment_count,
    });
  }

  return stats;
}

// =============================================================================
// MAIN EXPORT
// =============================================================================

/**
 * Generate complete vibelog schema
 *
 * Creates an Article schema with embedded media objects and proper
 * entity linking via @id references.
 */
export function generateVibelogSchema(options: VibelogSchemaOptions) {
  const { vibelog, author, locale } = options;
  const vibelogUrl = getVibelogUrl(author.username, vibelog.slug, locale);
  const authorUrl = getAuthorUrl(author.username);

  // Determine content type based on available media
  // Article is more universal than BlogPosting
  const articleType = vibelog.video_url ? 'Article' : 'Article';

  // Build the main article schema
  const articleSchema: Record<string, unknown> = {
    '@type': articleType,
    '@id': vibelogUrl,
    headline: vibelog.seo_title || vibelog.title,
    name: vibelog.title,
    description: extractDescription(vibelog.teaser, vibelog.content),
    url: vibelogUrl,

    // Dates
    datePublished: vibelog.published_at,
    dateModified: vibelog.created_at, // Use created_at as we don't track updates separately

    // Language
    inLanguage: locale || 'en',

    // Author (links to Person on profile page)
    author: generateAuthorSchema(author),

    // Publisher (links to global Organization)
    publisher: {
      '@id': `${VIBELOG_IDENTITY.url}/#organization`,
    },

    // Main image
    image: generateImageSchema(vibelog),

    // Main entity reference
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': vibelogUrl,
    },

    // Content accessibility
    isAccessibleForFree: true,
  };

  // Add word count if available
  if (vibelog.word_count) {
    articleSchema.wordCount = vibelog.word_count;
  }

  // Add keywords/tags
  if (vibelog.tags && vibelog.tags.length > 0) {
    articleSchema.keywords = vibelog.tags.join(', ');
  }

  // Add SEO keywords if available
  if (vibelog.seo_keywords && vibelog.seo_keywords.length > 0) {
    const existingKeywords = articleSchema.keywords as string || '';
    const seoKeywords = vibelog.seo_keywords.join(', ');
    articleSchema.keywords = existingKeywords
      ? `${existingKeywords}, ${seoKeywords}`
      : seoKeywords;
  }

  // Add article body (first 1000 chars for SEO, full content would be too long)
  if (vibelog.content) {
    articleSchema.articleBody = vibelog.content.substring(0, 1000);
  }

  // Add interaction statistics
  const interactionStats = generateInteractionStats(vibelog);
  if (interactionStats.length > 0) {
    articleSchema.interactionStatistic = interactionStats;
  }

  // Add audio if available
  const audioSchema = generateAudioSchema(vibelog, author);
  if (audioSchema) {
    articleSchema.audio = audioSchema;

    // Link to original recording page
    articleSchema.hasPart = {
      '@type': 'WebPage',
      '@id': `${vibelogUrl}/original`,
      name: 'Original Voice Recording',
      url: `${vibelogUrl}/original`,
    };
  }

  // Add video if available
  const videoSchema = generateVideoSchema(vibelog, author);
  if (videoSchema) {
    articleSchema.video = videoSchema;
  }

  // Add speakable for voice search (title + teaser)
  articleSchema.speakable = {
    '@type': 'SpeakableSpecification',
    cssSelector: ['h1', '[data-ai-summary="true"]'],
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [articleSchema],
  };
}

/**
 * Generate BreadcrumbList schema for vibelog pages
 */
export function generateVibelogBreadcrumbs(
  vibelog: { title: string; slug: string },
  author: { username: string; display_name: string },
  locale?: string
) {
  const base = VIBELOG_IDENTITY.url;
  const localePrefix = locale && locale !== 'en' ? `/${locale}` : '';

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: base,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: author.display_name,
        item: `${base}/@${author.username}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: vibelog.title,
        item: `${base}${localePrefix}/@${author.username}/${vibelog.slug}`,
      },
    ],
  };
}

/**
 * Get vibelog schemas as a combined JSON string
 * Convenience function for direct injection
 */
export function getVibelogSchemasJSON(options: VibelogSchemaOptions): string {
  const articleSchema = generateVibelogSchema(options);
  const breadcrumbSchema = generateVibelogBreadcrumbs(
    { title: options.vibelog.title, slug: options.vibelog.slug },
    { username: options.author.username, display_name: options.author.display_name },
    options.locale
  );

  // Return both schemas - they'll be separate script tags or can be combined
  return JSON.stringify([articleSchema, breadcrumbSchema]);
}
