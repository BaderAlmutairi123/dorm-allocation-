'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAuthState, clearAuthState } from '@/lib/auth'

export default function AuthButton() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userName, setUserName] = useState('')
  const router = useRouter()

  useEffect(() => {
    const authState = getAuthState()
    setIsAuthenticated(authState.isAuthenticated)
    setUserName(authState.user?.name || '')
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      clearAuthState()
      setIsAuthenticated(false)
      setUserName('')
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (isAuthenticated) {
    return (
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-700">Welcome, {userName}</span>
        <button
          onClick={handleLogout}
          className="text-sm text-indigo-600 hover:text-indigo-500"
        >
          Sign Out
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-4">
      <a
        href="/sign-in"
        className="text-sm text-indigo-600 hover:text-indigo-500"
      >
        Sign In
      </a>
    </div>
  )
}