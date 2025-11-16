'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/supabase/auth'

export default function AuthButton() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userName, setUserName] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await authClient.getSession()
        if (session) {
          setIsAuthenticated(true)
          // Get user data to display name
          const user = await authClient.getUser()
          if (user && user.user_metadata) {
            const firstName = user.user_metadata.first_name || ''
            const lastName = user.user_metadata.last_name || ''
            setUserName(`${firstName} ${lastName}`.trim() || user.email || 'User')
          }
        } else {
          setIsAuthenticated(false)
          setUserName('')
        }
      } catch {
        setIsAuthenticated(false)
        setUserName('')
      }
    }

    checkAuth()

    // Listen for auth state changes
    const { data: authListener } = authClient.onAuthStateChange(async (event, session) => {
      if (session) {
        setIsAuthenticated(true)
        const user = await authClient.getUser()
        if (user && user.user_metadata) {
          const firstName = user.user_metadata.first_name || ''
          const lastName = user.user_metadata.last_name || ''
          setUserName(`${firstName} ${lastName}`.trim() || user.email || 'User')
        }
      } else {
        setIsAuthenticated(false)
        setUserName('')
      }
    })

    // Cleanup listener on unmount
    return () => {
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  const handleLogout = async () => {
    try {
      await authClient.signOut()
      setIsAuthenticated(false)
      setUserName('')
      setIsDropdownOpen(false)
      router.push('/sign-in')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (isAuthenticated) {
    return (
      <div
        className="relative"
        onMouseEnter={() => setIsDropdownOpen(true)}
        onMouseLeave={() => setIsDropdownOpen(false)}
      >
        <button className="text-sm text-gray-700 hover:text-gray-900 cursor-pointer py-2">
          Welcome, {userName}
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 top-full w-28 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200">
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-4">
      <a
        href="/sign-in"
        className="text-sm text-indigo-600 hover:text-indigo-500"
      >
        Log In / Sign Up
      </a>
    </div>
  )
}