"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

type AuthContextType = {
  user: User | null
  profile: any | null
  loading: boolean
  signIn: (provider: 'google' | 'apple') => Promise<void>
  signOut: () => Promise<void>
  error: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // Fetch user profile when user changes
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error)
        return
      }

      setProfile(data)
    } catch (err) {
      console.error('Profile fetch error:', err)
    }
  }

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Session error:', error)
          setError(error.message)
        }

        setUser(session?.user ?? null)

        if (session?.user) {
          await fetchProfile(session.user.id)
        }
      } catch (err) {
        console.error('Auth initialization error:', err)
        setError('Failed to initialize authentication')
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email)

      setUser(session?.user ?? null)
      setProfile(null)

      if (session?.user) {
        await fetchProfile(session.user.id)
      }

      if (event === 'SIGNED_IN') {
        setError(null)
      }

      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const signIn = async (provider: 'google' | 'apple') => {
    try {
      setError(null)
      setLoading(true)

      // Ensure we use the correct redirect URL
      const redirectUrl = process.env.NEXT_PUBLIC_SITE_URL
        ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
        : `${window.location.origin}/auth/callback`

      console.log('=== OAUTH SIGN IN DEBUG ===')
      console.log('Provider:', provider)
      console.log('Environment SITE_URL:', process.env.NEXT_PUBLIC_SITE_URL)
      console.log('Window origin:', window.location.origin)
      console.log('Final redirect URL:', redirectUrl)
      console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      console.log('OAuth response:', { data, error })

      if (error) {
        console.error('Sign in error details:', {
          message: error.message,
          status: error.status,
          details: error
        })
        setError(`Sign in failed: ${error.message}`)
        setLoading(false)
        return
      }

      // If we get here without redirect, something's wrong
      console.log('OAuth response received but no redirect happened')
      console.log('This might indicate a configuration issue')

    } catch (err) {
      console.error('Sign in exception:', err)
      setError('Sign in failed. Please try again.')
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      console.log('🔄 AuthProvider signOut started')
      setError(null)
      console.log('🔄 Calling supabase.auth.signOut()')
      await supabase.auth.signOut()
      console.log('✅ Supabase signOut completed')
      setProfile(null)
      console.log('✅ AuthProvider signOut completed successfully')
    } catch (err) {
      console.error('❌ AuthProvider sign out error:', err)
      setError('Failed to sign out')
    }
  }

  const value = {
    user,
    profile,
    loading,
    signIn,
    signOut,
    error,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}