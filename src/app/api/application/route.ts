import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      studentId,
      firstName,
      lastName,
      email,
      phone,
      gender,
      major,
      year,
      roomType,
      bedtime,
      noiseLevel,
      cleanlinessLevel,
      guestPolicy,
    } = body

    // Validate required fields
    if (!studentId || !firstName || !lastName || !email || !phone || !gender || !year) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get the authorization token from the request
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    // Create an authenticated Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Create client with user's session token for RLS to work
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Verify authentication if token is provided
    if (token) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      if (authError || !user) {
        return NextResponse.json(
          { error: 'Unauthorized - Please sign in to submit an application' },
          { status: 401 }
        )
      }
      // Ensure studentId matches the authenticated user's ID
      if (user.id !== studentId) {
        return NextResponse.json(
          { error: 'Unauthorized - Student ID does not match authenticated user' },
          { status: 403 }
        )
      }
    }

    // Clean phone number (remove formatting for database storage)
    const cleanPhone = phone.replace(/\D/g, '');

    // Convert year level from text to number (Freshman = 1, Sophomore = 2, etc.)
    const yearLevelMap: { [key: string]: number } = {
      'Freshman': 1,
      'Sophomore': 2,
      'Junior': 3,
      'Senior': 4,
    }
    const yearLevelNumber = yearLevelMap[year] || 1;

    // Update existing student record (created during sign-up)
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .update({
        phone: cleanPhone,
        gender: gender,
        year_level: yearLevelNumber,
        major: major || null,
      })
      .eq('student_id', studentId)
      .select()

    if (studentError) {
      console.error('Error updating student:', studentError)
      return NextResponse.json(
        { error: 'Failed to update student record', details: studentError.message },
        { status: 500 }
      )
    }

    // Check if update was successful (record exists)
    if (!studentData || studentData.length === 0) {
      console.error('Student record not found for ID:', studentId)
      return NextResponse.json(
        { error: 'Your account setup is incomplete. Please sign out and create a new account.' },
        { status: 404 }
      )
    }

    // Insert into student_preferences table if preferences are provided
    if (roomType || bedtime || noiseLevel || cleanlinessLevel || guestPolicy) {
      const preferencesData: any = {
        preferred_room_type: roomType || null,
        bedtime: bedtime || null,
        noise_level: noiseLevel ? parseInt(noiseLevel) : null,
        cleanliness_level: cleanlinessLevel ? parseInt(cleanlinessLevel) : null,
        guest_policy_preference: guestPolicy ? parseInt(guestPolicy) : null,
      }

      // Insert preferences with student_id (matches your schema)
      const { error: preferencesError } = await supabase
        .from('student_preferences')
        .insert({
          ...preferencesData,
          student_id: studentIdValue,
        })

      if (preferencesError) {
        console.error('Error inserting preferences:', preferencesError)
        // Continue even if preferences fail, student record is created
      }
    }

    // Create a pending room assignment
    const assignmentData: any = {
      block_id: null, // Individual student, not part of a block
      room_id: null, // Will be assigned later by matching algorithm
      status: 'Pending',
    }

    // Create room assignment with student_id (matches your schema)
    const { error: assignmentError } = await supabase
      .from('room_assignments')
      .insert({
        ...assignmentData,
        student_id: studentIdValue,
      })

    if (assignmentError) {
      console.error('Error creating room assignment:', assignmentError)
      // Continue even if assignment creation fails
    }

    return NextResponse.json(
      {
        message: 'Application submitted successfully',
        student: studentData
      },
      { status: 201 }
    )

  } catch (error: any) {
    console.error('Error processing application:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
