import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Ultra-Fast OAuth Callback Handler
 *
 * Minimal processing for maximum speed:
 * 1. Handle errors immediately
 * 2. Exchange code for session
 * 3. Set cookies and redirect
 *
 * Client will cache session via AuthProvider
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // === HANDLE ERRORS ===
  if (error) {
    console.error('OAuth error:', error, errorDescription);
    const message =
      error === 'access_denied' ? 'Sign in was cancelled' : `Auth failed: ${errorDescription}`;
    return NextResponse.redirect(
      new URL(`/auth/signin?error=${encodeURIComponent(message)}`, request.url)
    );
  }

  // === VALIDATE CODE ===
  if (!code) {
    console.error('No OAuth code provided');
    return NextResponse.redirect(new URL('/auth/signin?error=no_code', request.url));
  }

  // === EXCHANGE CODE FOR SESSION ===
  try {
    console.log('🔄 [OAuth Callback] Starting code exchange...');
    const requestUrl = new URL(request.url);

    // Check for VibeLog claim parameters
    const claimSessionId = searchParams.get('claim');
    const returnTo = searchParams.get('returnTo');

    // Default redirect to dashboard
    let redirectUrl = new URL('/dashboard', requestUrl.origin);
    const response = NextResponse.redirect(redirectUrl);

    // Import cookies
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();

    // Create Supabase client with Brave-compatible cookie handling
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              // Brave-compatible cookie options
              const cookieOptions = {
                ...options,
                sameSite: 'lax' as const, // Brave works better with 'lax' than 'strict'
                secure: true,
                path: options.path || '/',
              };
              cookieStore.set({ name, value, ...cookieOptions });
              response.cookies.set({ name, value, ...cookieOptions });
            } catch (err) {
              // Cookies are read-only in some contexts
              console.warn('Cookie set warning:', err);
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.delete({ name, ...options });
              response.cookies.delete({ name, ...options });
            } catch (err) {
              console.warn('Cookie delete warning:', err);
            }
          },
        },
      }
    );

    // Exchange code for session
    console.log('🔄 [OAuth Callback] Exchanging code for session...');
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('❌ [OAuth Callback] Code exchange failed:', exchangeError);
      return NextResponse.redirect(
        new URL(`/auth/signin?error=${encodeURIComponent(exchangeError.message)}`, request.url)
      );
    }

    if (!data.session) {
      console.error('❌ [OAuth Callback] No session returned');
      return NextResponse.redirect(new URL('/auth/signin?error=no_session', request.url));
    }

    // Log success
    console.log(
      '✅ [OAuth Callback] Success! User:',
      data.user?.email,
      'Session established'
    );

    // === HANDLE VIBELOG CLAIMING ===
    if (claimSessionId && returnTo) {
      console.log('🔐 [OAuth Callback] Claiming anonymous VibeLog...');
      try {
        // Extract public slug from returnTo (/v/[slug])
        const publicSlug = returnTo.split('/v/')[1];

        if (publicSlug) {
          // Call claim-vibelog API
          const claimResponse = await fetch(`${requestUrl.origin}/api/claim-vibelog`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Cookie: response.headers.get('Set-Cookie') || '',
            },
            body: JSON.stringify({
              sessionId: claimSessionId,
              publicSlug: publicSlug,
            }),
          });

          if (claimResponse.ok) {
            const claimData = await claimResponse.json();
            console.log('✅ [OAuth Callback] VibeLog claimed successfully!');
            console.log('📍 [OAuth Callback] New URL:', claimData.newUrl);

            // Redirect to the newly owned VibeLog
            redirectUrl = new URL(claimData.newUrl, requestUrl.origin);
            return NextResponse.redirect(redirectUrl);
          } else {
            const claimError = await claimResponse.json();
            console.error('❌ [OAuth Callback] Failed to claim VibeLog:', claimError);
            // Fall through to redirect to returnTo anyway
            redirectUrl = new URL(returnTo, requestUrl.origin);
            return NextResponse.redirect(redirectUrl);
          }
        }
      } catch (claimErr) {
        console.error('💥 [OAuth Callback] Error claiming VibeLog:', claimErr);
        // Fall through to normal redirect
      }
    }

    // Redirect to dashboard or returnTo (AuthProvider will cache session)
    if (returnTo && !claimSessionId) {
      redirectUrl = new URL(returnTo, requestUrl.origin);
    }

    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    console.error('Callback error:', err);
    return NextResponse.redirect(
      new URL(
        `/auth/signin?error=${encodeURIComponent(err instanceof Error ? err.message : 'Unknown error')}`,
        request.url
      )
    );
  }
}
