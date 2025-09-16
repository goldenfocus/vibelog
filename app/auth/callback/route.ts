import { createServerSupabaseClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Handle OAuth errors (user cancelled, etc.)
  if (error) {
    console.error('OAuth error:', error, errorDescription)
    const errorMessage = error === 'access_denied'
      ? 'Sign in was cancelled'
      : 'Authentication failed'
    return NextResponse.redirect(
      new URL(`/auth/signin?error=${encodeURIComponent(errorMessage)}`, request.url)
    )
  }

  if (code) {
    try {
      const supabase = await createServerSupabaseClient()
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('Auth callback error:', exchangeError)
        return NextResponse.redirect(
          new URL(`/auth/signin?error=${encodeURIComponent('Authentication failed')}`, request.url)
        )
      }

      // Log successful sign in for debugging
      if (data.user) {
        console.log('Successful sign in:', data.user.email, data.user.user_metadata)
      }

    } catch (err) {
      console.error('Callback processing error:', err)
      return NextResponse.redirect(
        new URL('/auth/signin?error=callback_error', request.url)
      )
    }
  }

  // Redirect to home page after successful authentication
  return NextResponse.redirect(new URL('/', request.url))
}