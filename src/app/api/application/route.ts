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
