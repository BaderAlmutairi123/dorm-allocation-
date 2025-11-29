'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/supabase/auth'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'

export default function SignUpPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [validationErrors, setValidationErrors] = useState<{
    firstName?: string
    lastName?: string
    email?: string
    password?: string
    confirmPassword?: string
  }>({})
  const router = useRouter()

  const validateForm = () => {
    const errors: typeof validationErrors = {}

    // First name validation
    if (!firstName.trim()) {
      errors.firstName = 'First name is required'
    } else if (firstName.trim().length < 2) {
      errors.firstName = 'First name must be at least 2 characters'
    }

    // Last name validation
    if (!lastName.trim()) {
      errors.lastName = 'Last name is required'
    } else if (lastName.trim().length < 2) {
      errors.lastName = 'Last name must be at least 2 characters'
    }

    // Email validation
    if (!email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address'
    }

    // Password validation
    if (!password) {
      errors.password = 'Password is required'
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }

    // Confirm password validation
    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password'
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    // Validate form
    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      console.log('Attempting sign up with:', { email: email.trim(), firstName: firstName.trim(), lastName: lastName.trim() })

      // FIRST: Check if email already exists in the database BEFORE creating auth user
      const { data: existingStudent, error: checkError } = await supabase
        .from('students')
        .select('id, email')
        .eq('email', email.trim())
        .maybeSingle()

      console.log('Email check result:', { existingStudent, checkError })

      if (existingStudent) {
        console.log('Email already registered in database')
        setError('This email is already registered. Please log in or use a different email.')
        setIsLoading(false)
        return
      }

      // SECOND: Sign up using Supabase client-side auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            email: email.trim(),
          }
        }
      })

      console.log('Sign up response:', { data, error: signUpError })

      // Check for auth errors
      if (signUpError) {
        console.error('Sign up error:', signUpError)
        setError(signUpError.message || 'Failed to create account. Please try again.')
        setIsLoading(false)
        return
      }

      // Check if sign up was successful
      if (!data?.user) {
        console.warn('Sign up returned but no user data')
        setError('Failed to create account. Please try again.')
        setIsLoading(false)
        return
      }

      // Check if this is a new user that needs email confirmation
      if (data?.user && !data?.session) {
        console.log('User created but needs email confirmation')
        setSuccessMessage('Account created! Please check your email and click the verification link to complete registration.')
        setIsLoading(false)
        return
      }

      // Success - create student record in database
      console.log('User created, inserting into students table...')

      // Insert student record into the students table
      console.log('=== ATTEMPTING TO INSERT STUDENT RECORD ===')
      console.log('Student ID:', data.user.id)
      console.log('Email:', email.trim())
      console.log('First Name:', firstName.trim())
      console.log('Last Name:', lastName.trim())

      const { data: insertData, error: insertError } = await supabase
        .from('students')
        .insert({
          student_id: data.user.id,
          email: email.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          year_level: '1', // Default to freshman as string to match VARCHAR schema
        })
        .select()

      console.log('=== INSERT RESULT ===')
      console.log('Insert Data:', insertData)
      console.log('Insert Error:', insertError)

      if (insertError) {
        console.error('Error creating student profile:', insertError)
        console.error('Error Code:', insertError.code)
        console.error('Error Message:', insertError.message)
        console.error('Error Details:', insertError.details)
        console.error('Error Hint:', insertError.hint)

        // Check if it's a duplicate key error (race condition - user was created between our check and now)
        if (insertError.code === '23505') {
          // Duplicate key - this email was registered during sign-up process
          console.log('Race condition: Student profile already exists')
          setError('This email is already registered. Please log in or use a different email.')
          setIsLoading(false)
          return
        } else {
          // Show the actual error to the user for debugging
          console.error('Database insert failed:', insertError.message || insertError)
          setError(`Failed to create student profile: ${insertError.message}. Please check the console for details.`)
          setIsLoading(false)
          return
        }
      } else {
        console.log('✓ Student profile created successfully!')
        console.log('Inserted data:', insertData)
      }

      // Redirect to application page
      console.log('Redirecting to application page...')
      router.push('/application')
      router.refresh()
    } catch (err: any) {
      console.error('Sign up error:', err)
      setError(err.message || 'An error occurred during sign up. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            {/* First Name */}
            <div>
              <label htmlFor="first-name" className="sr-only">
                First Name
              </label>
              <input
                id="first-name"
                name="firstName"
                type="text"
                autoComplete="given-name"
                className={`appearance-none relative block w-full px-3 py-2 border ${
                  validationErrors.firstName ? 'border-red-500' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="First Name"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value)
                  setValidationErrors({ ...validationErrors, firstName: undefined })
                }}
              />
              {validationErrors.firstName && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.firstName}</p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="last-name" className="sr-only">
                Last Name
              </label>
              <input
                id="last-name"
                name="lastName"
                type="text"
                autoComplete="family-name"
                className={`appearance-none relative block w-full px-3 py-2 border ${
                  validationErrors.lastName ? 'border-red-500' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value)
                  setValidationErrors({ ...validationErrors, lastName: undefined })
                }}
              />
              {validationErrors.lastName && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.lastName}</p>
              )}
            </div>
            
            {/* Email */}
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                className={`appearance-none relative block w-full px-3 py-2 border ${
                  validationErrors.email ? 'border-red-500' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="Email address"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setValidationErrors({ ...validationErrors, email: undefined })
                }}
              />
              {validationErrors.email && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                className={`appearance-none relative block w-full px-3 py-2 border ${
                  validationErrors.password ? 'border-red-500' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="Password (min 6 characters)"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setValidationErrors({ ...validationErrors, password: undefined })
                }}
              />
              {validationErrors.password && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirm-password" className="sr-only">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                className={`appearance-none relative block w-full px-3 py-2 border ${
                  validationErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  setValidationErrors({ ...validationErrors, confirmPassword: undefined })
                }}
              />
              {validationErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.confirmPassword}</p>
              )}
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="text-green-600 text-sm text-center font-medium">
              {successMessage}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating account...' : 'Sign up'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/sign-in" className="font-medium text-indigo-600 hover:text-indigo-500">
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
