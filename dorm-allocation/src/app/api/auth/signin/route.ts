import { NextRequest, NextResponse } from 'next/server'

// Mock user database - In production, this would be replaced with a real database
const mockUsers = [
  {
    id: 1,
    email: 'student@university.edu',
    password: 'password123', // In production, this would be hashed
    name: 'John Student',
    studentId: 'STU001'
  },
  {
    id: 2,
    email: 'jane@university.edu',
    password: 'password456', // In production, this would be hashed
    name: 'Jane Smith',
    studentId: 'STU002'
  }
]

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user in mock database
    const user = mockUsers.find(
      u => u.email === email && u.password === password
    )

    if (!user) {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // In production, you would generate a proper JWT token
    const token = `mock-jwt-token-${user.id}-${Date.now()}`

    // Return success response with token and user info
    return NextResponse.json(
      {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          studentId: user.studentId
        },
        message: 'Sign in successful'
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Sign in error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}