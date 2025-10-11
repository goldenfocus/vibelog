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
    const requestUrl = new URL(request.url);
    const response = NextResponse.redirect(new URL('/dashboard', requestUrl.origin));

    // Import cookies
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();

    // Create Supabase client with cookie handling
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
              cookieStore.set({ name, value, ...options });
              response.cookies.set({ name, value, ...options });
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
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Code exchange failed:', exchangeError);
      return NextResponse.redirect(
        new URL(`/auth/signin?error=${encodeURIComponent(exchangeError.message)}`, request.url)
      );
    }

    // Log success
    console.log('✅ OAuth success:', data.user?.email);

    // Redirect to dashboard (AuthProvider will cache session)
    return response;
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
