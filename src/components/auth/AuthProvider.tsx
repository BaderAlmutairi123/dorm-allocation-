"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { authClient } from '@/lib/supabase/auth';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current session on mount
    const initializeAuth = async () => {
      try {
        // First check if there's a session
        const session = await authClient.getSession();
        if (session) {
          // Only get user if session exists
          const currentUser = await authClient.getUser();
          setUser(currentUser);
        } else {
          setUser(null);
        }
      } catch (error) {
        // Silently handle auth errors - user is not logged in
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen to auth changes
    const { data: { subscription } } = authClient.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
