'use client';

import type { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useRef, useState } from 'react';

import { clearCachedSession, getCachedSession, setCachedSession } from '@/lib/auth-cache';
import { ensureProfileExists } from '@/lib/ensure-profile';
import { createClient } from '@/lib/supabase';

// God Mode: Check if we should impersonate another user
async function getGodModeUser(actualUser: User): Promise<User | null> {
  try {
    // Check for god mode cookie (client-side check)
    const cookies = document.cookie.split(';');
    const godModeCookie = cookies.find(c => c.trim().startsWith('vibelog_god_mode='));

    if (!godModeCookie) {
      return null;
    }

    const cookieValue = godModeCookie.split('=')[1];
    if (!cookieValue) {
      return null;
    }

    const session = JSON.parse(decodeURIComponent(cookieValue));

    // Check if session is expired
    if (Date.now() > session.expiresAt) {
      return null;
    }

    // Verify the actual user is the admin who entered god mode
    if (actualUser.id !== session.adminUserId) {
      return null;
    }

    // Fetch target user's auth data from Supabase
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, username')
      .eq('id', session.targetUserId)
      .single();

    if (error || !data) {
      console.error('[God Mode] Failed to fetch target user:', error);
      return null;
    }

    // Return a fake User object that looks like the target user
    // This makes the entire app think we're logged in as the target user
    return {
      ...actualUser,
      id: data.id,
      email: data.email || actualUser.email,
      user_metadata: {
        ...actualUser.user_metadata,
        name: data.username,
      },
    };
  } catch (error) {
    console.error('[God Mode] Error checking god mode:', error);
    return null;
  }
}

type AuthContextType = {
  user: User | null;
  loading: boolean;
  isSigningOut: boolean;
  signIn: (provider: 'google' | 'apple') => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  error: string | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Ultra-Fast AuthProvider
 *
 * Performance Optimizations:
 * - Instant load from localStorage cache (0ms)
 * - Background session validation
 * - No timeouts (proper error handling)
 * - Optimistic sign out (< 100ms)
 * - Browser-specific handling
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Initialize as null to avoid hydration mismatch
  // Cache will be loaded in useEffect after mount
  const [user, setUser] = useState<User | null>(null);

  // Start with loading=true, will be updated after cache check
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const isSigningOutRef = useRef(false);
  const hasMountedRef = useRef(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    hasMountedRef.current = true;

    // ====== CHECK CACHE FIRST (SYNCHRONOUS) ======
    const cachedUser = getCachedSession();
    if (cachedUser) {
      setUser(cachedUser);
      setLoading(false); // Show UI immediately with cached user
    }

    // ====== BACKGROUND VALIDATION ======
    const validateSession = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (!mounted) {
          return;
        }

        if (sessionError) {
          // Expected errors when logged out - don't log these
          if (
            sessionError.message?.includes('Refresh Token') ||
            sessionError.message?.includes('refresh_token') ||
            sessionError.message?.includes('Not Found')
          ) {
            // Silent - this is expected when logged out, not an error
          } else {
            // Only log unexpected errors
            if (process.env.NODE_ENV !== 'production') {
              console.error('Session validation error:', sessionError);
            }
            setError(sessionError.message);
          }
          // Clear cache if session is invalid
          clearCachedSession();
          setUser(null);
          setLoading(false);
          return;
        }

        if (session?.user) {
          // Check for God Mode - if active, use target user instead
          const godModeUser = await getGodModeUser(session.user);
          const effectiveUser = godModeUser || session.user;

          // Update cache if session is valid
          setCachedSession(session.user); // Cache real user, not god mode user
          setUser(effectiveUser); // But display god mode user if active
        } else {
          // No session, clear cache
          clearCachedSession();
          setUser(null);
        }

        setLoading(false);
      } catch (err) {
        console.error('Session validation failed:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Auth error');
          setLoading(false);
        }
      }
    };

    // Run validation in background (doesn't block UI if cache exists)
    validateSession();

    // ====== LISTEN FOR AUTH CHANGES ======
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) {
        return;
      }

      // Ignore SIGNED_OUT during manual sign out (we handle it optimistically)
      if (event === 'SIGNED_OUT' && isSigningOutRef.current) {
        return;
      }

      // Update user state and cache
      if (session?.user) {
        // Check for God Mode - if active, use target user instead
        const godModeUser = await getGodModeUser(session.user);
        const effectiveUser = godModeUser || session.user;

        setCachedSession(session.user); // Cache real user
        setUser(effectiveUser); // Display god mode user if active
        setError(null);

        // CRITICAL: Ensure profile exists (catches users whose profiles failed to create)
        if (event === 'SIGNED_IN') {
          ensureProfileExists(supabase, session.user.id)
            .then(result => {
              if (result.created) {
                console.log('✅ [AUTH] Created missing profile for user:', session.user.email);
              } else if (!result.success) {
                console.error('❌ [AUTH] Profile check failed:', result.error);
              }
            })
            .catch(err => {
              console.error('❌ [AUTH] Profile check error:', err);
            });
        }
      } else {
        clearCachedSession();
        setUser(null);
      }

      setLoading(false);
    });

    // ====== CROSS-TAB SYNC VIA STORAGE EVENTS ======
    // Listen for localStorage changes in other tabs
    const handleStorageChange = (e: StorageEvent) => {
      // Only respond to changes in our session cache key
      if (e.key === 'vibelog_session_cache') {
        if (e.newValue) {
          // Session was updated in another tab - refresh our state
          const cachedUser = getCachedSession();
          if (cachedUser) {
            console.log('🔄 [AUTH] Session updated in another tab, syncing...');
            setUser(cachedUser);
            setLoading(false);
          }
        } else if (e.oldValue && !e.newValue) {
          // Session was cleared in another tab - sign out here too
          console.log('🚪 [AUTH] Signed out in another tab, syncing...');
          setUser(null);
          setLoading(false);
        }
      }
    };

    // Register storage event listener for cross-tab sync
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
    }

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageChange);
      }
    };
  }, [supabase, router]);

  /**
   * Sign in with OAuth provider
   * Triggers OAuth flow, redirects to provider
   */
  const signIn = async (provider: 'google' | 'apple') => {
    try {
      setError(null);
      setLoading(true);

      // Clean up any stale OAuth state before starting new flow
      console.log('🧹 Clearing stale OAuth hash before sign in');
      if (typeof window !== 'undefined') {
        // Clear URL hash (Supabase OAuth state)
        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
        // REMOVED: signOut({ scope: 'local' }) - This was breaking OAuth state cookies
        // causing "bad_oauth_state" errors
      }

      // Build redirect URL
      const redirectUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback`
          : `${process.env.NEXT_PUBLIC_SITE_URL || ''}/auth/callback`;

      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (signInError) {
        console.error('OAuth sign in error:', signInError);
        setError(`Sign in failed: ${signInError.message}`);
        setLoading(false);
        return;
      }

      // OAuth redirect will happen automatically
      // Loading state will be cleared by callback or auth state change
    } catch (err) {
      console.error('Sign in exception:', err);
      setError('Sign in failed. Please try again.');
      setLoading(false);
    }
  };

  /**
   * Ultra-fast optimistic sign out
   * - Clears UI state immediately (< 100ms)
   * - Navigates instantly
   * - Calls Supabase in background
   */
  const signOut = async () => {
    try {
      isSigningOutRef.current = true;
      setIsSigningOut(true);

      // PHASE 1: Clear UI state immediately (optimistic)
      setUser(null);
      clearCachedSession();
      setError(null);
      setLoading(false);

      // PHASE 2: Navigate to community page (keep users engaged!)
      router.replace('/community');

      // PHASE 3: Call Supabase in background (don't block UI)
      supabase.auth
        .signOut()
        .catch(err => {
          console.warn('Supabase sign out error (non-critical):', err);
        })
        .finally(() => {
          isSigningOutRef.current = false;
          setIsSigningOut(false);
        });
    } catch (err) {
      console.error('Sign out error:', err);
      // Even on error, ensure user is signed out locally
      setUser(null);
      clearCachedSession();
      setLoading(false);
      router.replace('/community');
      isSigningOutRef.current = false;
      setIsSigningOut(false);
    }
  };

  /**
   * Manually refresh session
   * Useful for recovering from auth errors
   */
  const refreshSession = async () => {
    try {
      setLoading(true);
      const {
        data: { session },
        error: refreshError,
      } = await supabase.auth.refreshSession();

      if (refreshError) {
        console.error('Session refresh error:', refreshError);
        clearCachedSession();
        setUser(null);
        setError(refreshError.message);
        setLoading(false);
        return;
      }

      if (session?.user) {
        // Check for God Mode - if active, use target user instead
        const godModeUser = await getGodModeUser(session.user);
        const effectiveUser = godModeUser || session.user;

        setCachedSession(session.user);
        setUser(effectiveUser);
        setError(null);
      } else {
        clearCachedSession();
        setUser(null);
      }

      setLoading(false);
    } catch (err) {
      console.error('Refresh session failed:', err);
      setError(err instanceof Error ? err.message : 'Refresh failed');
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    isSigningOut,
    signIn,
    signOut,
    refreshSession,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
