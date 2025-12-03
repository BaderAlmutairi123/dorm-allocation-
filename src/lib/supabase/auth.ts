import { supabase } from './client'
import { supabaseServerClient } from './server'
import type { Student } from './types'

// Client-side authentication helpers
export const authClient = {
  /**
   * Sign up a new user with email and password
   */
  async signUp(email: string, password: string, userData: Partial<Student>) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData, // Additional user metadata
      },
    })

    if (error) throw error
    return data
  },

  /**
   * Sign in an existing user
   */
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    return data
  },

  /**
   * Sign out the current user
   */
  async signOut() {
    const { error } = await supabase.auth.signOut({ scope: 'global' })
    if (error) throw error
  },

  /**
   * Get the current session
   */
  async getSession() {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return data.session
  },

  /**
   * Get the current user
   */
  async getUser() {
    const { data, error } = await supabase.auth.getUser()
    if (error) throw error
    return data.user
  },

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback)
  },

  /**
   * Reset password for email
   */
  async resetPassword(email: string) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (error) throw error
    return data
  },

  /**
   * Update user password
   */
  async updatePassword(newPassword: string) {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) throw error
    return data
  },
}

// Server-side authentication helpers
export const authServer = {
  /**
   * Get user from server-side (for API routes and server components)
   */
  async getUser(accessToken: string) {
    const { data, error } = await supabaseServerClient.auth.getUser(accessToken)
    if (error) throw error
    return data.user
  },

  /**
   * Verify JWT token
   */
  async verifyToken(token: string) {
    try {
      const { data, error } = await supabaseServerClient.auth.getUser(token)
      if (error) return null
      return data.user
    } catch {
      return null
    }
  },
}
