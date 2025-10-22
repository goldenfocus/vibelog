'use client';

import type { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useRef, useState } from 'react';

import { clearCachedSession, getCachedSession, setCachedSession } from '@/lib/auth-cache';
import { createClient } from '@/lib/supabase';

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
  // Initialize with cache immediately (synchronous)
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      const cached = getCachedSession();
      if (cached) {
        return cached;
      }
    }
    return null;
  });

  // Start with loading=false if cache exists, true otherwise
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      const hasCache = getCachedSession() !== null;
      return !hasCache; // false if cache exists, true if no cache
    }
    return true;
  });

  const [error, setError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const isSigningOutRef = useRef(false);
  const hasMountedRef = useRef(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    hasMountedRef.current = true;

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
          // Expected errors when logged out
          if (
            sessionError.message?.includes('Refresh Token') ||
            sessionError.message?.includes('refresh_token')
          ) {
            // No active session - this is expected when logged out
          } else {
            console.error('Session validation error:', sessionError);
            setError(sessionError.message);
          }
          // Clear cache if session is invalid
          clearCachedSession();
          setUser(null);
          setLoading(false);
          return;
        }

        if (session?.user) {
          // Update cache if session is valid
          setCachedSession(session.user);
          setUser(session.user);
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
        setCachedSession(session.user);
        setUser(session.user);
        setError(null);
      } else {
        clearCachedSession();
        setUser(null);
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
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
      console.log('🧹 Clearing stale OAuth state before sign in');
      if (typeof window !== 'undefined') {
        // Clear URL hash (Supabase OAuth state)
        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
        // Clear any existing session to ensure fresh OAuth flow
        await supabase.auth.signOut({ scope: 'local' });
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
        setCachedSession(session.user);
        setUser(session.user);
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
