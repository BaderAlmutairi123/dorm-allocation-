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

    // Insert into students table
    // Your schema uses student_id as the primary key (UUID)
    const studentInsertData: any = {
      first_name: firstName,
      last_name: lastName,
      email: email,
      phone: cleanPhone, // Store digits only
      gender: gender,
      year_level: year,
      major: major || null,
    }

    // If studentId is a valid UUID, use it as student_id; otherwise let it auto-generate
    if (studentId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentId)) {
      studentInsertData.student_id = studentId
    }
    
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .insert(studentInsertData)
      .select()

    if (studentError) {
      console.error('Error inserting student:', studentError)
      return NextResponse.json(
        { error: 'Failed to create student record', details: studentError.message },
        { status: 500 }
      )
    }

    // Get the student ID from the inserted record
    const insertedStudent = studentData?.[0]
    const studentIdValue = insertedStudent?.student_id || studentId

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
