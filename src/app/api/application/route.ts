import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function POST(request: Request) {
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
      gpa,
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

    // Insert into students table
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .insert({
        student_id: studentId, // This should be the auth user ID
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone,
        gender: gender,
        year_level: year,
        major: major || null,
        gpa: gpa ? parseFloat(gpa) : null,
      })
      .select()

    if (studentError) {
      console.error('Error inserting student:', studentError)
      return NextResponse.json(
        { error: 'Failed to create student record', details: studentError.message },
        { status: 500 }
      )
    }

    // Insert into student_preferences table if preferences are provided
    if (roomType || bedtime || noiseLevel || cleanlinessLevel || guestPolicy) {
      const { error: preferencesError } = await supabase
        .from('student_preferences')
        .insert({
          student_id: studentId,
          preferred_room_type: roomType || null,
          bedtime: bedtime || null,
          noise_level: noiseLevel ? parseInt(noiseLevel) : null,
          cleanliness_level: cleanlinessLevel ? parseInt(cleanlinessLevel) : null,
          guest_policy_preference: guestPolicy ? parseInt(guestPolicy) : null,
        })

      if (preferencesError) {
        console.error('Error inserting preferences:', preferencesError)
        // Continue even if preferences fail, student record is created
      }
    }

    // Create a pending room assignment
    const { error: assignmentError } = await supabase
      .from('room_assignments')
      .insert({
        student_id: studentId,
        block_id: null, // Individual student, not part of a block
        room_id: null, // Will be assigned later by matching algorithm
        status: 'Pending',
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
