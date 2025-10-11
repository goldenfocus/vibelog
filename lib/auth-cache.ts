import type { User } from '@supabase/supabase-js';

/**
 * Session Cache Utilities
 *
 * Ultra-fast authentication via localStorage caching
 * - Instant initial render (0ms)
 * - Background validation
 * - 1-hour cache expiry
 * - Multi-tab sync via storage events
 */

const SESSION_CACHE_KEY = 'vibelog_session_cache';
const SESSION_CACHE_VERSION = 1;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

interface SessionCache {
  version: number;
  user: User;
  expiresAt: number;
  cachedAt: number;
}

/**
 * Get cached session from localStorage (or sessionStorage as fallback for Brave)
 * Returns null if cache is invalid or expired
 */
export function getCachedSession(): User | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    // Try localStorage first
    let cached = localStorage.getItem(SESSION_CACHE_KEY);

    // Fallback to sessionStorage if localStorage blocked (Brave Shields)
    if (!cached) {
      cached = sessionStorage.getItem(SESSION_CACHE_KEY);
    }

    if (!cached) {
      return null;
    }

    const data: SessionCache = JSON.parse(cached);

    // Version check
    if (data.version !== SESSION_CACHE_VERSION) {
      clearCachedSession();
      return null;
    }

    // Expiry check
    if (Date.now() > data.expiresAt) {
      clearCachedSession();
      return null;
    }

    return data.user;
  } catch (error) {
    console.warn('Failed to read session cache:', error);
    clearCachedSession();
    return null;
  }
}

/**
 * Cache session in localStorage (with sessionStorage fallback for Brave)
 */
export function setCachedSession(user: User): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const cache: SessionCache = {
      version: SESSION_CACHE_VERSION,
      user,
      expiresAt: Date.now() + CACHE_DURATION_MS,
      cachedAt: Date.now(),
    };

    const cacheStr = JSON.stringify(cache);

    // Try localStorage first
    try {
      localStorage.setItem(SESSION_CACHE_KEY, cacheStr);
    } catch {
      // localStorage blocked (Brave Shields) - fallback to sessionStorage
      console.warn('localStorage blocked, using sessionStorage fallback');
    }

    // Always write to sessionStorage as fallback for Brave
    sessionStorage.setItem(SESSION_CACHE_KEY, cacheStr);
  } catch (error) {
    console.warn('Failed to cache session:', error);
  }
}

/**
 * Clear session cache from both localStorage and sessionStorage
 */
export function clearCachedSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(SESSION_CACHE_KEY);
    sessionStorage.removeItem(SESSION_CACHE_KEY);
  } catch (error) {
    console.warn('Failed to clear session cache:', error);
  }
}

/**
 * Check if cached session exists and is valid
 */
export function isSessionCacheValid(): boolean {
  return getCachedSession() !== null;
}

/**
 * Browser detection utilities
 */
export async function detectBrowser() {
  const ua = navigator.userAgent;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const braveAPI = (navigator as any).brave;

  return {
    isBrave: !!braveAPI?.isBrave && (await braveAPI.isBrave()),
    isComet: ua.includes('Comet'),
    isSafari: /^((?!chrome|android).)*safari/i.test(ua),
    isFirefox: ua.includes('Firefox'),
    isChrome: ua.includes('Chrome') && !ua.includes('Edg'),
  };
}

/**
 * Get browser-specific cookie options
 */
export function getBrowserCookieOptions() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isBrave = (navigator as any).brave?.isBrave;

  return {
    sameSite: (isBrave ? 'lax' : 'strict') as 'lax' | 'strict',
    secure: true,
    path: '/',
  };
}
