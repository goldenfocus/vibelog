import { createServerAdminClient } from '@/lib/supabaseAdmin';
import crypto from 'crypto';

// Cache durations in milliseconds
const CACHE_DURATIONS: Record<string, number> = {
  transcription: 30 * 24 * 60 * 60 * 1000, // 30 days
  tts: 30 * 24 * 60 * 60 * 1000, // 30 days
  image: 30 * 24 * 60 * 60 * 1000, // 30 days
  generation: 0, // No caching for dynamic content
};

/**
 * Get cached AI response if available and not expired
 */
export async function getCachedResponse(
  service: string,
  input: string | Buffer
): Promise<any | null> {
  if (CACHE_DURATIONS[service] === 0) {
    return null;
  }

  const cacheKey = generateCacheKey(service, input);
  const supabase = await createServerAdminClient();

  const { data } = await supabase
    .from('ai_cache')
    .select('response')
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (data) {
    console.log(`[CACHE HIT] ${service} - Saved API call`);
    return data.response;
  }

  return null;
}

/**
 * Store AI response in cache with expiration
 */
export async function setCachedResponse(
  service: string,
  input: string | Buffer,
  response: any
): Promise<void> {
  if (CACHE_DURATIONS[service] === 0) {
    return;
  }

  const cacheKey = generateCacheKey(service, input);
  const supabase = await createServerAdminClient();

  const expiresAt = new Date(Date.now() + CACHE_DURATIONS[service]);

  await supabase.from('ai_cache').upsert(
    {
      cache_key: cacheKey,
      service,
      response,
      expires_at: expiresAt.toISOString(),
    },
    { onConflict: 'cache_key' }
  );

  console.log(`[CACHE STORE] ${service} - Response cached until ${expiresAt.toISOString()}`);
}

/**
 * Generate deterministic cache key from service and input
 */
function generateCacheKey(service: string, input: string | Buffer): string {
  const hash = crypto.createHash('sha256');
  hash.update(service);
  hash.update(typeof input === 'string' ? input : input.toString('base64'));
  return hash.digest('hex');
}

/**
 * Clear expired cache entries (call periodically)
 */
export async function clearExpiredCache(): Promise<number> {
  const supabase = await createServerAdminClient();

  const { data, error } = await supabase
    .from('ai_cache')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('id');

  if (error) {
    console.error('Error clearing expired cache:', error);
    return 0;
  }

  const deletedCount = data?.length || 0;
  if (deletedCount > 0) {
    console.log(`[CACHE CLEANUP] Removed ${deletedCount} expired entries`);
  }

  return deletedCount;
}
