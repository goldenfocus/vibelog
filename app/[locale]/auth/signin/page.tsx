'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';

function SignInContent() {
  const { signIn, loading, error } = useAuth();
  const searchParams = useSearchParams();
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setUrlError(decodeURIComponent(errorParam));
    }

    // Clean up any stale OAuth state from previous attempts
    // This prevents auto-resuming failed OAuth flows
    if (window.location.hash) {
      console.log('🧹 Cleaning up stale OAuth hash from previous session');
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    // Debug info
    console.log('SignIn page loaded');
    console.log('Current URL:', window.location.href);
    console.log('Environment:', {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    });
  }, [searchParams]);

  const displayError = error || urlError;

  const handleSignIn = async () => {
    // Prevent double-clicks
    if (isSigningIn || loading) {
      console.warn('⚠️ Sign in already in progress, ignoring duplicate click');
      return;
    }

    console.log('Sign in button clicked');
    setIsSigningIn(true);

    try {
      await signIn('google');
    } catch (err) {
      console.error('Sign in failed:', err);
      setIsSigningIn(false);
    }
    // Note: don't reset isSigningIn on success - we'll be redirected away
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="w-full max-w-md rounded-2xl border border-electric/20 bg-card/95 p-8 shadow-2xl backdrop-blur-lg">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-2xl font-bold text-foreground">Continue with VibeLog</h1>
          <p className="text-muted-foreground">
            Sign in or create your account to save vibelogs and access your dashboard
          </p>
        </div>

        {displayError && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/20 p-3">
            <p className="text-center text-sm text-destructive">{displayError}</p>
            {displayError.includes('OAuth session expired') && (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Tip: Make sure to click the sign in button only once and wait for Google to load.
              </p>
            )}
          </div>
        )}

        <div className="space-y-4">
          <Button
            onClick={handleSignIn}
            disabled={loading || isSigningIn}
            className="relative w-full bg-electric py-4 font-medium text-white shadow-lg transition-all duration-200 hover:bg-electric-glow hover:shadow-electric/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {loading || isSigningIn ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Connecting...
              </>
            ) : (
              'Continue with Google'
            )}
          </Button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black">
          <div className="text-electric">Loading...</div>
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
