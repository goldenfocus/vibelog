/**
 * Client-safe image utility functions
 * These functions can be safely imported in both client and server components
 */

/**
 * Check if a URL is a temporary OpenAI DALL-E URL that will expire
 * These URLs expire within ~1 hour and can't be proxied through Next.js Image
 */
export function isExpiredOpenAIUrl(url: string | null | undefined): boolean {
  if (!url) {
    return false;
  }
  return url.includes('oaidalleapiprodscus.blob.core.windows.net');
}

/**
 * Get a safe image URL for use with next/image
 * Returns null if the URL is an expired OpenAI temporary URL
 */
export function getSafeImageUrl(url: string | null | undefined): string | null {
  if (!url || isExpiredOpenAIUrl(url)) {
    return null;
  }
  return url;
}
