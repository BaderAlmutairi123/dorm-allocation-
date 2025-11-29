import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, firstName, lastName, yearLevel } = body

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseServer.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          year_level: yearLevel,
        },
      },
    })

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    // Create student profile in database
    // Your schema uses student_id as the primary key
    if (authData.user) {
      const { error: profileError } = await supabaseServer
        .from('students')
        .insert({
          student_id: authData.user.id, // Use auth user ID as student_id
          email,
          first_name: firstName,
          last_name: lastName,
          year_level: yearLevel,
        })

      if (profileError) {
        console.error('Error creating student profile:', profileError)
        // Note: Auth user is created but profile failed
        // You may want to handle this case differently
      }
    }

    return NextResponse.json({
      message: 'User created successfully',
      user: authData.user,
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
