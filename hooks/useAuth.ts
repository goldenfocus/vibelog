"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isLoggedIn: boolean;
}

export function useAuth(): AuthState {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isLoggedIn: false
  });

  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
        }

        setAuthState({
          user: session?.user ?? null,
          isLoading: false,
          isLoggedIn: !!session?.user
        });
      } catch (error) {
        console.error('Error in getInitialSession:', error);
        setAuthState({
          user: null,
          isLoading: false,
          isLoggedIn: false
        });
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);

        setAuthState({
          user: session?.user ?? null,
          isLoading: false,
          isLoggedIn: !!session?.user
        });
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return authState;
}

// Convenience hook for checking auth status
export function useIsLoggedIn(): boolean {
  const { isLoggedIn } = useAuth();
  return isLoggedIn;
}

// Hook for getting current user
export function useCurrentUser(): User | null {
  const { user } = useAuth();
  return user;
}