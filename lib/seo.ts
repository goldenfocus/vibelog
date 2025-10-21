/**
 * SEO Utilities for VibeLog
 * Centralized SEO metadata generation
 */

interface SEOMetadata {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  twitterTitle: string;
  twitterDescription: string;
}

/**
 * Extract SEO description from markdown content
 * Strips markdown syntax and returns plain text excerpt
 */
export function extractSEODescription(
  content: string,
  maxLength: number = 160
): string {
  // Remove markdown headers
  let plainText = content.replace(/^#+\s+/gm, '');

  // Remove bold/italic
  plainText = plainText.replace(/\*\*([^*]+)\*\*/g, '$1');
  plainText = plainText.replace(/\*([^*]+)\*/g, '$1');
  plainText = plainText.replace(/__([^_]+)__/g, '$1');
  plainText = plainText.replace(/_([^_]+)_/g, '$1');

  // Remove links
  plainText = plainText.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Remove code blocks
  plainText = plainText.replace(/```[\s\S]*?```/g, '');
  plainText = plainText.replace(/`([^`]+)`/g, '$1');

  // Remove images
  plainText = plainText.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');

  // Collapse whitespace and newlines
  plainText = plainText.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();

  // Truncate and add ellipsis
  if (plainText.length > maxLength) {
    // Try to break at word boundary
    const truncated = plainText.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace) + '...';
    }
    return truncated + '...';
  }

  return plainText;
}

/**
 * Generate SEO-friendly title
 * Optimizes for search engines and social sharing
 */
export function generateSEOTitle(title: string, maxLength: number = 60): string {
  const cleanTitle = title.trim();

  if (cleanTitle.length <= maxLength) {
    return cleanTitle;
  }

  // Try to break at word boundary
  const truncated = cleanTitle.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }

  return truncated + '...';
}

/**
 * Generate complete SEO metadata for a VibeLog post
 */
export function generateVibelogSEO(
  title: string,
  content: string,
  teaser?: string
): SEOMetadata {
  const seoTitle = generateSEOTitle(title);
  const contentForDescription = teaser || content;
  const description = extractSEODescription(contentForDescription);

  return {
    title: seoTitle,
    description,
    ogTitle: seoTitle,
    ogDescription: description,
    twitterTitle: seoTitle,
    twitterDescription: description,
  };
}

/**
 * Generate public slug from title
 * Creates URL-safe slug with random suffix for uniqueness
 */
export function generatePublicSlug(title: string): string {
  // Extract base slug from title
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .substring(0, 50); // Limit length

  // Add random suffix for uniqueness
  const randomSuffix = Math.random().toString(36).substring(2, 10);

  return `${baseSlug}-${randomSuffix}`.substring(0, 80);
}

/**
 * Generate user-based slug from title and ID
 * Used for owned VibeLog posts
 */
export function generateUserSlug(title: string, vibelogId: string): string {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 60);

  const idSuffix = vibelogId.substring(0, 8);

  return `${baseSlug}-${idSuffix}`.substring(0, 100);
}

/**
 * Validate and sanitize slug
 */
export function sanitizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}
