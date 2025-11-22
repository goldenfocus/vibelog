import { createBrowserClient } from '@supabase/ssr';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key';

// Client-side Supabase client with Brave-compatible settings
export const createClient = () =>
  createBrowserClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Accept: 'application/json',
      },
    },
    cookieOptions: {
      // Brave-compatible cookie options
      sameSite: 'lax', // 'lax' works better with Brave than 'strict'
      secure: true,
      path: '/',
    },
  });

// Server-side Supabase client
export const createServerSupabaseClient = async () => {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.delete({ name, ...options });
      },
    },
  });
};
