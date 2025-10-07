import { NextRequest, NextResponse } from 'next/server'

// Mock user database - In production, this would be replaced with a real database
let mockUsers = [
  {
    id: 1,
    email: 'student@university.edu',
    password: 'password123',
    name: 'John Student',
    studentId: 'STU001'
  },
  {
    id: 2,
    email: 'jane@university.edu',
    password: 'password456',
    name: 'Jane Smith',
    studentId: 'STU002'
  }
]

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, studentId } = await request.json()

    // Validate input
    if (!email || !password || !name || !studentId) {
      return NextResponse.json(
        { message: 'All fields are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = mockUsers.find(u => u.email === email || u.studentId === studentId)
    if (existingUser) {
      return NextResponse.json(
        { message: 'User with this email or student ID already exists' },
        { status: 409 }
      )
    }

    // Create new user
    const newUser = {
      id: mockUsers.length + 1,
      email,
      password, // In production, this would be hashed
      name,
      studentId
    }

    mockUsers.push(newUser)

    // Generate token
    const token = `mock-jwt-token-${newUser.id}-${Date.now()}`

    // Return success response
    return NextResponse.json(
      {
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          studentId: newUser.studentId
        },
        message: 'Account created successfully'
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Sign up error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}