import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  console.log('=== AUTH CALLBACK DEBUG ===');
  console.log('Request URL:', request.url);
  console.log('Code:', code ? 'present' : 'missing');
  console.log('Error:', error);
  console.log('Error Description:', errorDescription);
  console.log('All URL params:', Object.fromEntries(searchParams.entries()));

  // Handle OAuth errors (user cancelled, etc.)
  if (error) {
    console.error('OAuth error detected:', error, errorDescription);
    const errorMessage =
      error === 'access_denied'
        ? 'Sign in was cancelled'
        : `Authentication failed: ${error} - ${errorDescription || 'Unknown error'}`;
    return NextResponse.redirect(
      new URL(`/auth/signin?error=${encodeURIComponent(errorMessage)}`, request.url)
    );
  }

  if (code) {
    const requestUrl = new URL(request.url);
    const response = NextResponse.redirect(new URL('/dashboard', requestUrl.origin));

    try {
      console.log('Processing auth code exchange...');

      // Import next/headers to get cookies
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();

      // Create Supabase client with proper cookie handling for response
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value;
            },
            set(name: string, value: string, options: CookieOptions) {
              // Set cookie in both the cookie store AND the response
              try {
                cookieStore.set({ name, value, ...options });
                response.cookies.set({ name, value, ...options });
              } catch {
                // Cookie is read-only in some contexts, ignore
              }
            },
            remove(name: string, options: CookieOptions) {
              try {
                cookieStore.delete({ name, ...options });
                response.cookies.delete({ name, ...options });
              } catch {
                // Cookie is read-only in some contexts, ignore
              }
            },
          },
        }
      );

      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error('Supabase auth exchange error:', {
          message: exchangeError.message,
          status: exchangeError.status,
          details: exchangeError,
        });
        return NextResponse.redirect(
          new URL(
            `/auth/signin?error=${encodeURIComponent(`Auth exchange failed: ${exchangeError.message}`)}`,
            request.url
          )
        );
      }

      // Log successful sign in for debugging
      if (data.user) {
        console.log('✅ Successful sign in:', {
          email: data.user.email,
          id: data.user.id,
          provider: data.user.app_metadata?.provider,
          metadata: data.user.user_metadata,
        });
      }

      console.log('Redirecting to dashboard with session cookies...');
      return response;
    } catch (err) {
      console.error('Callback processing error:', err);
      return NextResponse.redirect(
        new URL(
          `/auth/signin?error=${encodeURIComponent(`Callback error: ${err instanceof Error ? err.message : 'Unknown error'}`)}`,
          request.url
        )
      );
    }
  }

  console.log('No code or error, redirecting to sign in...');
  return NextResponse.redirect(new URL('/auth/signin?error=no_code', request.url));
}
