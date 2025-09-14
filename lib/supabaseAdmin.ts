import 'server-only'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

/**
 * Server-only admin Supabase client using the service role key.
 * Never import this from client components.
 */
export const createServerAdminClient = async () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations')
  }

  const { cookies } = await import('next/headers')
  const cookieStore = cookies()

  return createServerClient(supabaseUrl, serviceRoleKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options })
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.delete({ name, ...options })
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

