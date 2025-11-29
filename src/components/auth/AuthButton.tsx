'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/supabase/auth'
import { supabase } from '@/lib/supabase/client'

export default function AuthButton() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userName, setUserName] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [closeTimeout, setCloseTimeout] = useState<NodeJS.Timeout | null>(null)
  const router = useRouter()

  useEffect(() => {
    const capitalizeFirstLetter = (str: string) => {
      if (!str) return ''
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
    }

    const getUserDisplayName = async (user: any) => {
      // First, try to get name from user metadata
      let firstName = user.user_metadata?.first_name || ''
      let lastName = user.user_metadata?.last_name || ''

      // If metadata is empty, try fetching from students table
      if (!firstName || !lastName) {
        try {
          const { data: studentData, error } = await supabase
            .from('students')
            .select('first_name, last_name')
            .eq('student_id', user.id)
            .single()

          if (!error && studentData) {
            firstName = studentData.first_name || firstName
            lastName = studentData.last_name || lastName
          }
        } catch (err) {
          console.error('Error fetching student data:', err)
        }
      }

      // Capitalize first letter of first and last name
      const formattedFirstName = capitalizeFirstLetter(firstName)
      const formattedLastName = capitalizeFirstLetter(lastName)

      return `${formattedFirstName} ${formattedLastName}`.trim() || user.email || 'User'
    }

    const checkAuth = async () => {
      try {
        const session = await authClient.getSession()
        if (session) {
          setIsAuthenticated(true)
          // Get user data to display name
          const user = await authClient.getUser()
          if (user) {
            const displayName = await getUserDisplayName(user)
            setUserName(displayName)
          }
        } else {
          setIsAuthenticated(false)
          setUserName('')
        }
      } catch (error: any) {
        console.error('Auth check error:', error)
        // Clear invalid session data
        if (error?.message?.includes('refresh_token_not_found') || error?.message?.includes('Invalid Refresh Token')) {
          console.log('Clearing invalid session...')
          await supabase.auth.signOut()
        }
        setIsAuthenticated(false)
        setUserName('')
      }
    }

    checkAuth()

    // Listen for auth state changes
    const { data: authListener } = authClient.onAuthStateChange(async (event, session) => {
      try {
        if (session) {
          setIsAuthenticated(true)
          const user = await authClient.getUser()
          if (user) {
            const displayName = await getUserDisplayName(user)
            setUserName(displayName)
          }
        } else {
          setIsAuthenticated(false)
          setUserName('')
        }
      } catch (error) {
        console.error('Auth state change error:', error)
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
    console.log('=== LOGOUT CLICKED ===')
    try {
      console.log('Attempting to sign out...')
      await authClient.signOut()
      console.log('Sign out successful')
      setIsAuthenticated(false)
      setUserName('')
      setIsDropdownOpen(false)
      router.push('/sign-in')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
      alert('Failed to sign out: ' + error)
    }
  }

  const handleMouseEnter = () => {
    if (closeTimeout) {
      clearTimeout(closeTimeout)
      setCloseTimeout(null)
    }
    setIsDropdownOpen(true)
  }

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setIsDropdownOpen(false)
    }, 200) // 200ms delay to allow click to register
    setCloseTimeout(timeout)
  }

  if (isAuthenticated) {
    return (
      <div
        className="relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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