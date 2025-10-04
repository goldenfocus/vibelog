'use client';

import type { User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState } from 'react';

import { createClient } from '@/lib/supabase';

type Profile = {
  id: string;
  [key: string]: unknown;
} | null;

type AuthContextType = {
  user: User | null;
  profile: Profile;
  loading: boolean;
  signIn: (provider: 'google' | 'apple') => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  // Fetch user profile when user changes (non-blocking, with timeout)
  const fetchProfile = async (userId: string) => {
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timeout')), 3000)
      );

      const fetchPromise = supabase.from('profiles').select('*').eq('id', userId).single();

      const result = await Promise.race([fetchPromise, timeoutPromise]);
      const { data, error } = result as {
        data: Profile;
        error: { code?: string; message?: string };
      };

      if (error) {
        // Handle common profile fetch errors gracefully
        if (error.code === 'PGRST116') {
          console.log('No profile found for user, which is normal for new users');
        } else if (error.code === '42501' || error.code === 'PGRST204') {
          console.log('Profile access restricted by RLS policies, continuing without profile');
        } else {
          console.warn('Profile fetch error (non-critical):', error.message);
        }
        setProfile(null);
        return;
      }

      setProfile(data);
    } catch (err) {
      console.warn('Profile fetch error (non-critical):', err);
      setProfile(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('🔄 AuthProvider: Getting initial session...');
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          // Refresh token errors are expected when logged out or session expired
          if (
            error.message?.includes('Refresh Token') ||
            error.message?.includes('refresh_token')
          ) {
            console.log('ℹ️ No active session (expected when logged out)');
          } else {
            console.error('Session error:', error);
            setError(error.message);
          }
        }

        if (mounted) {
          console.log('🔄 AuthProvider: Setting initial user:', session?.user?.email || 'none');
          setUser(session?.user ?? null);

          if (session?.user) {
            await fetchProfile(session.user.id);
          }

          // Always set loading to false after initial session check
          setLoading(false);
          console.log('✅ AuthProvider: Initial session processing complete, loading=false');
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        if (mounted) {
          setError('Failed to initialize authentication');
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state change:', event, session?.user?.email);

      if (!mounted) {
        console.log('⚠️ Component unmounted, skipping auth state change');
        return;
      }

      try {
        // Only set loading to true for sign-out operations
        if (event === 'SIGNED_OUT') {
          setLoading(true);
        }

        setUser(session?.user ?? null);
        setProfile(null);

        // Fetch profile in background (don't block on it)
        if (session?.user) {
          console.log('📥 Fetching profile for user:', session.user.id);
          fetchProfile(session.user.id)
            .then(() => {
              console.log('✅ Profile fetch completed');
            })
            .catch(err => {
              console.warn('⚠️ Profile fetch failed:', err);
            });
        }

        if (event === 'SIGNED_IN') {
          setError(null);
        }

        // Set loading to false immediately (don't wait for profile)
        console.log('🔄 Setting loading to false for event:', event);
        setLoading(false);
        console.log('✅ Auth state processed for event:', event, 'loading set to false');
      } catch (err) {
        console.error('❌ Error in auth state change handler:', err);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (provider: 'google' | 'apple') => {
    try {
      setError(null);
      setLoading(true);

      // Prefer the current browser origin so local dev stays on localhost.
      let redirectUrl: string | null = null;
      if (typeof window !== 'undefined') {
        redirectUrl = `${window.location.origin}/auth/callback`;
      } else if (process.env.NEXT_PUBLIC_SITE_URL) {
        redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`;
      }

      if (!redirectUrl) {
        console.warn('No site URL available for OAuth redirect; falling back to relative path.');
        redirectUrl = '/auth/callback';
      }

      console.log('=== OAUTH SIGN IN DEBUG ===');
      console.log('Provider:', provider);
      console.log('Environment SITE_URL:', process.env.NEXT_PUBLIC_SITE_URL);
      console.log('Window origin:', window.location.origin);
      console.log('Final redirect URL:', redirectUrl);
      console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      console.log('OAuth response:', { data, error });

      if (error) {
        console.error('Sign in error details:', {
          message: error.message,
          status: error.status,
          details: error,
        });
        setError(`Sign in failed: ${error.message}`);
        setLoading(false);
        return;
      }

      // If we get here without redirect, something's wrong
      console.log('OAuth response received but no redirect happened');
      console.log('This might indicate a configuration issue');
    } catch (err) {
      console.error('Sign in exception:', err);
      setError('Sign in failed. Please try again.');
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      console.log('🔄 AuthProvider signOut started');
      setError(null);
      setLoading(true);

      console.log('🔄 Calling supabase.auth.signOut()');
      await supabase.auth.signOut();
      console.log('✅ Supabase signOut completed');

      // Clear state immediately after successful sign out
      setUser(null);
      setProfile(null);
      setLoading(false);
      console.log('✅ AuthProvider signOut completed successfully');
    } catch (err) {
      console.error('❌ AuthProvider sign out error:', err);
      setError('Failed to sign out');
      setLoading(false);
    }
  };

  const value = {
    user,
    profile,
    loading,
    signIn,
    signOut,
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
