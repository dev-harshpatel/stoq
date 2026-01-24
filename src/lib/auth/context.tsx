'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../supabase/client'

type AuthContextType = {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ user: User | null }>
  signUp: (email: string, password: string) => Promise<{ user: User | null; session: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial user
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return { user: data.user }
  }

  const signUp = async (email: string, password: string) => {
    // Prioritize NEXT_PUBLIC_SITE_URL for production, fallback to window.location.origin
    // This ensures production uses the correct URL even if window.location is different
    const getRedirectUrl = () => {
      // In production, prefer the environment variable
      if (process.env.NEXT_PUBLIC_SITE_URL) {
        return `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
      }
      // In browser, use current origin
      if (typeof window !== 'undefined') {
        return `${window.location.origin}/auth/callback`
      }
      // Fallback for SSR
      return 'http://localhost:3000/auth/callback'
    }
    
    const redirectTo = getRedirectUrl()
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
      },
    })
    
    // When email confirmation is required:
    // - User IS created (you'll receive email)
    // - Session IS null (no immediate login)
    // - Supabase returns user in data.user even if session is null
    
    // IMPORTANT: Even if there's an error about session, if user exists, return it
    // The user was successfully created, they just need to confirm email
    if (data?.user) {
      // User was created - return it regardless of error
      // Session will be null if email confirmation is required
      return { user: data.user, session: data.session }
    }
    
    // If there's an error and no user was created, throw it
    if (error) {
      throw error
    }
    
    // No user and no error - shouldn't happen
    throw new Error('Failed to create user account')
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

