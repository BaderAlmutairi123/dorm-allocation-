import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase/server'
import { calculateCompatibility, runMatchingAlgorithm } from '@/lib/matching/algorithm'

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

    // Check if student record exists first
    const { data: existingStudent } = await supabase
      .from('students')
      .select('student_id')
      .eq('student_id', studentId)
      .single()

    let studentData

    if (existingStudent) {
      // Update existing student record using authenticated client (RLS will enforce ownership)
      const { data: updatedData, error: studentError } = await supabase
        .from('students')
        .update({
          phone: cleanPhone,
          gender: gender,
          year_level: yearLevelNumber,
          major: major || null,
        })
        .eq('student_id', studentId)
        .select()
        .single()

      if (studentError) {
        console.error('Error updating student:', studentError)
        return NextResponse.json(
          { error: 'Failed to update student record', details: studentError.message },
          { status: 500 }
        )
      }
      studentData = updatedData
    } else {
      // Insert new student record using authenticated client (RLS will enforce ownership)
      const { data: insertedData, error: studentError } = await supabase
        .from('students')
        .insert({
          student_id: studentId,
          email: email,
          first_name: firstName,
          last_name: lastName,
          phone: cleanPhone,
          gender: gender,
          year_level: yearLevelNumber,
          major: major || null,
        })
        .select()
        .single()

      if (studentError) {
        console.error('Error inserting student:', studentError)
        return NextResponse.json(
          { error: 'Failed to create student record', details: studentError.message },
          { status: 500 }
        )
      }
      studentData = insertedData
    }

    // Check if operation was successful
    if (!studentData) {
      console.error('Student record operation failed for ID:', studentId)
      return NextResponse.json(
        { error: 'Failed to save student record. Please try again.' },
        { status: 500 }
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

      // Check if preferences already exist
      const { data: existingPreferences } = await supabase
        .from('student_preferences')
        .select('student_id')
        .eq('student_id', studentId)
        .single()

      let preferencesError

      if (existingPreferences) {
        // Update existing preferences
        const { error } = await supabase
          .from('student_preferences')
          .update(preferencesData)
          .eq('student_id', studentId)
        preferencesError = error
      } else {
        // Insert new preferences
        const { error } = await supabase
          .from('student_preferences')
          .insert({
            ...preferencesData,
            student_id: studentId,
          })
        preferencesError = error
      }

      if (preferencesError) {
        console.error('Error saving preferences:', preferencesError)
        // Continue even if preferences fail, student record is created
      }
    }

    // Try to find compatible students and create/join a block
    let blockId: number | null = null
    let matchedStudents: string[] = []

    if (supabaseAdmin && (roomType || bedtime || noiseLevel || cleanlinessLevel || guestPolicy)) {
      try {
        // Get current student data with preferences
        const currentStudent = {
          student_id: studentId,
          first_name: firstName,
          last_name: lastName,
          email: email,
          gender: gender,
          year_level: String(yearLevelNumber),
          major: major || null,
          preferences: {
            preferred_room_type: roomType || null,
            bedtime: bedtime || null,
            noise_level: noiseLevel ? parseInt(noiseLevel) : null,
            cleanliness_level: cleanlinessLevel ? parseInt(cleanlinessLevel) : null,
            guest_policy_preference: guestPolicy ? parseInt(guestPolicy) : null,
          }
        }

        // Find other pending students with same gender
        const { data: pendingAssignments } = await supabaseAdmin
          .from('room_assignments')
          .select('student_id')
          .eq('status', 'Pending')
          .is('block_id', null) // Only students not already in a block
          .neq('student_id', studentId) // Exclude current student

        if (pendingAssignments && pendingAssignments.length > 0) {
          const pendingStudentIds = pendingAssignments.map(a => a.student_id)

          // Get student data and preferences
          const { data: students } = await supabaseAdmin
            .from('students')
            .select('student_id, first_name, last_name, email, gender, year_level, major')
            .in('student_id', pendingStudentIds)
            .eq('gender', gender) // Same gender only

          if (students && students.length > 0) {
            const { data: allPreferences } = await supabaseAdmin
              .from('student_preferences')
              .select('*')
              .in('student_id', students.map(s => s.student_id))

            // Calculate compatibility with each student
            const compatibilityScores: Array<{
              student: any
              score: number
            }> = []

            for (const student of students) {
              const studentPref = allPreferences?.find(p => p.student_id === student.student_id) || null
              
              const candidateStudent = {
                student_id: student.student_id,
                first_name: student.first_name,
                last_name: student.last_name,
                email: student.email,
                gender: student.gender,
                year_level: String(student.year_level || ''),
                major: student.major,
                preferences: studentPref
              }

              const compatibility = calculateCompatibility(currentStudent, candidateStudent)
              
              // Only consider students with compatibility score >= 60
              if (compatibility.score >= 60) {
                compatibilityScores.push({
                  student: candidateStudent,
                  score: compatibility.score
                })
              }
            }

            // Sort by compatibility score (highest first)
            compatibilityScores.sort((a, b) => b.score - a.score)

            // Find or create a block with compatible students
            // Try to find an existing block with space (max 8 members)
            if (compatibilityScores.length > 0) {
              // Get existing blocks and their member counts
              const { data: existingBlocks } = await supabaseAdmin
                .from('student_blocks')
                .select('block_id')

              let foundBlock = false

              if (existingBlocks && existingBlocks.length > 0) {
                const blockIds = existingBlocks.map(b => b.block_id)

                // Get member counts for each block
                const { data: blockMembers } = await supabaseAdmin
                  .from('block_members')
                  .select('block_id, student_id')
                  .in('block_id', blockIds)

                if (blockMembers) {
                  const blockMemberCounts = new Map<number, number>()
                  blockMembers.forEach(m => {
                    blockMemberCounts.set(m.block_id, (blockMemberCounts.get(m.block_id) || 0) + 1)
                  })

                  // Find a block with space (max 8 members, need at least 2 more spots for new student + 1 compatible)
                  for (const [blockIdNum, count] of blockMemberCounts.entries()) {
                    if (count < 7) { // Room for at least 2 more (current + 1 compatible)
                      // Check if any compatible students are already in this block
                      const blockStudentIds = blockMembers
                        .filter(m => m.block_id === blockIdNum)
                        .map(m => m.student_id)

                      // Find compatible students not in this block
                      const availableCompatible = compatibilityScores.filter(
                        cs => !blockStudentIds.includes(cs.student.student_id)
                      )

                      if (availableCompatible.length > 0) {
                        blockId = blockIdNum
                        matchedStudents = [availableCompatible[0].student.student_id]
                        foundBlock = true
                        break
                      }
                    }
                  }
                }
              }

              // If no existing block found, create a new one with the best match
              if (!foundBlock && compatibilityScores.length > 0) {
                // Generate a unique block code
                const blockCode = `BLK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

                // Create new block
                const { data: newBlock, error: blockError } = await supabaseAdmin
                  .from('student_blocks')
                  .insert({
                    code: blockCode
                  })
                  .select('block_id')
                  .single()

                if (!blockError && newBlock) {
                  blockId = newBlock.block_id
                  matchedStudents = [compatibilityScores[0].student.student_id]

                  // Add compatible student to block
                  await supabaseAdmin
                    .from('block_members')
                    .insert({
                      block_id: blockId,
                      student_id: matchedStudents[0]
                    })
                }
              }

              // Add current student to block if we found/created one
              if (blockId !== null) {
                await supabaseAdmin
                  .from('block_members')
                  .insert({
                    block_id: blockId,
                    student_id: studentId
                  })

                // Update compatible student's room assignment with block_id
                if (matchedStudents.length > 0) {
                  await supabaseAdmin
                    .from('room_assignments')
                    .update({ block_id: blockId })
                    .eq('student_id', matchedStudents[0])
                    .eq('status', 'Pending')
                }
              }
            }
          }
        }
      } catch (error: any) {
        console.error('Error in auto-matching:', error)
        // Continue even if matching fails - student can still be assigned individually
      }
    }

    // Create or update a pending room assignment
    const assignmentData: any = {
      block_id: blockId, // Will be null if no match found
      room_id: null, // Will be assigned later by matching algorithm
      status: 'Pending',
    }

    // Check if room assignment already exists (student_id is unique)
    const { data: existingAssignment, error: checkError } = await supabase
      .from('room_assignments')
      .select('assignment_id, student_id, room_id')
      .eq('student_id', studentId)
      .maybeSingle() // Use maybeSingle() instead of single() to avoid errors when no record exists

    let assignmentError

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is fine, other errors are real problems
      console.error('Error checking for existing assignment:', checkError)
    }

    if (existingAssignment) {
      // Update existing assignment (student resubmitting application)
      // Only update if status is Pending or if we want to reset a Confirmed assignment
      const { error } = await supabase
        .from('room_assignments')
        .update({
          ...assignmentData,
          // Reset room_id if updating from Confirmed back to Pending
          room_id: assignmentData.status === 'Pending' ? null : existingAssignment.room_id,
        })
        .eq('student_id', studentId)
      assignmentError = error
    } else {
      // Insert new assignment - use upsert to handle race conditions
      const { error } = await supabase
        .from('room_assignments')
        .upsert({
          ...assignmentData,
          student_id: studentId,
        }, {
          onConflict: 'student_id', // Use student_id as the conflict resolution key
          ignoreDuplicates: false
        })
      assignmentError = error
    }

    if (assignmentError) {
      console.error('Error saving room assignment:', assignmentError)
      // If it's a duplicate key error, try to update instead
      if (assignmentError.code === '23505') {
        console.log('Duplicate key detected, attempting update instead...')
        const { error: updateError } = await supabase
          .from('room_assignments')
          .update(assignmentData)
          .eq('student_id', studentId)
        
        if (updateError) {
          console.error('Error updating room assignment after duplicate key:', updateError)
        }
      }
      // Continue even if assignment creation fails - don't break the application submission
    }

    // Run matching algorithm automatically in the background
    // Don't wait for it or fail the request if it errors
    runMatchingAlgorithm().catch(error => {
      console.error('Error running automatic matching after application submission:', error)
      // Don't throw - this is a background process
    })

    return NextResponse.json(
      {
        message: blockId 
          ? `Application submitted successfully. You've been matched with ${matchedStudents.length} compatible student(s) and added to a block!`
          : 'Application submitted successfully. We\'re matching you with compatible roommates now.',
        student: studentData,
        blockId: blockId,
        matchedStudents: matchedStudents.length
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

// DELETE - Reset/restart application
export async function DELETE(request: NextRequest) {
  try {
    // Get the authorization token from the request
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

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

    // Verify authentication
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      )
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      )
    }

    const studentId = user.id

    // Use admin client to bypass RLS for deletions
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error - admin client not available' },
        { status: 500 }
      )
    }

    // Delete from block_members first (foreign key constraint)
    const { error: blockMemberError } = await supabaseAdmin
      .from('block_members')
      .delete()
      .eq('student_id', studentId)

    if (blockMemberError) {
      console.error('Error deleting block membership:', blockMemberError)
    }

    // Delete room assignment
    const { error: assignmentError } = await supabaseAdmin
      .from('room_assignments')
      .delete()
      .eq('student_id', studentId)

    if (assignmentError) {
      console.error('Error deleting room assignment:', assignmentError)
    }

    // Delete student preferences
    const { error: preferencesError } = await supabaseAdmin
      .from('student_preferences')
      .delete()
      .eq('student_id', studentId)

    if (preferencesError) {
      console.error('Error deleting preferences:', preferencesError)
    }

    // Note: We don't reset student record fields (phone, gender, etc.)
    // because phone has a unique constraint and can't be set to null if other students have null
    // The student will update these fields when they resubmit their application

    return NextResponse.json(
      { message: 'Application has been reset successfully. You can now submit a new application.' },
      { status: 200 }
    )

  } catch (error: any) {
    console.error('Error resetting application:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}