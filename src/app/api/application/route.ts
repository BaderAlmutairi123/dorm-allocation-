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
      assignmentPreference, // "random", "private", or "single"
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

    // Handle room assignment based on preference
    let blockId: number | null = null
    let matchedStudents: string[] = []
    let blockCode: string | null = null

    if (supabaseAdmin) {
      try {
        // OPTION 0: Join block pending - student will join a block separately, don't create assignment yet
        if (assignmentPreference === 'join_block_pending') {
          // Don't create any block or assignment - the join block API will handle this
          blockId = null
        }
        // OPTION 1: Single room - no block needed
        else if (assignmentPreference === 'single' || roomType === 'Single') {
          // No block creation for single rooms
          blockId = null
        }
        // OPTION 2: Private room - create empty block for student to invite friends
        else if (assignmentPreference === 'private') {
          // Generate a unique block code
          blockCode = `${Math.random().toString(36).substring(2, 8).toUpperCase()}`
          
          // Create new block with just this student
          const { data: newBlock, error: blockError } = await supabaseAdmin
            .from('student_blocks')
            .insert({
              code: blockCode,
              block_leader_id: studentId,
              max_capacity: roomType === 'Suite' ? 4 : 2,
              current_capacity: 1,
            })
            .select('block_id, code')
            .single()

          if (!blockError && newBlock) {
            blockId = newBlock.block_id
            blockCode = newBlock.code

            // Add student as leader of the block
            await supabaseAdmin
              .from('block_members')
              .insert({
                block_id: blockId,
                student_id: studentId,
                is_leader: true,
                joined_date: new Date().toISOString().split('T')[0],
              })
          }
        }
        // OPTION 3: Random matching - find compatible roommates
        else if (assignmentPreference === 'random') {
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

          // Find other pending students with same gender who also want random matching
          const { data: pendingAssignments } = await supabaseAdmin
            .from('room_assignments')
            .select('student_id')
            .eq('status', 'Pending')
            .is('block_id', null)
            .neq('student_id', studentId)

          if (pendingAssignments && pendingAssignments.length > 0) {
            const pendingStudentIds = pendingAssignments.map(a => a.student_id)

            const { data: students } = await supabaseAdmin
              .from('students')
              .select('student_id, first_name, last_name, email, gender, year_level, major')
              .in('student_id', pendingStudentIds)
              .eq('gender', gender)

            if (students && students.length > 0) {
              const { data: allPreferences } = await supabaseAdmin
                .from('student_preferences')
                .select('*')
                .in('student_id', students.map(s => s.student_id))

              const compatibilityScores: Array<{ student: any; score: number }> = []

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
                if (compatibility.score >= 60) {
                  compatibilityScores.push({ student: candidateStudent, score: compatibility.score })
                }
              }

              compatibilityScores.sort((a, b) => b.score - a.score)

              if (compatibilityScores.length > 0) {
                // Create a new block with the best match
                const newBlockCode = `BLK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

                const { data: newBlock, error: blockError } = await supabaseAdmin
                  .from('student_blocks')
                  .insert({ code: newBlockCode })
                  .select('block_id, code')
                  .single()

                if (!blockError && newBlock) {
                  blockId = newBlock.block_id
                  blockCode = newBlock.code
                  matchedStudents = [compatibilityScores[0].student.student_id]

                  // Add both students to the block
                  await supabaseAdmin
                    .from('block_members')
                    .insert([
                      { block_id: blockId, student_id: studentId, is_leader: true },
                      { block_id: blockId, student_id: matchedStudents[0], is_leader: false }
                    ])

                  // Update matched student's room assignment with block_id
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
        console.error('Error in room assignment:', error)
        // Continue even if matching fails
      }
    }

    // Create or update a pending room assignment (skip for join_block_pending)
    if (assignmentPreference !== 'join_block_pending') {
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
    }

    // Determine response message based on assignment preference
    let message = 'Application submitted successfully.'
    if (assignmentPreference === 'join_block_pending') {
      message = 'Student information saved. Ready to join block.'
    } else if (assignmentPreference === 'single' || roomType === 'Single') {
      message = 'Application submitted successfully. You\'ll be assigned a single room.'
    } else if (assignmentPreference === 'private' && blockCode) {
      message = `Application submitted successfully. Your block code is: ${blockCode}. Share this with friends to have them join your room!`
    } else if (assignmentPreference === 'random' && matchedStudents.length > 0) {
      message = `Application submitted successfully. You've been matched with ${matchedStudents.length} compatible roommate(s)!`
    } else if (assignmentPreference === 'random') {
      message = 'Application submitted successfully. We\'re looking for compatible roommates for you.'
    }

    return NextResponse.json(
      {
        message,
        student: studentData,
        blockId: blockId,
        blockCode: blockCode, // Include block code for private rooms
        matchedStudents: matchedStudents.length,
        assignmentPreference: assignmentPreference || 'random'
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

    // ============================================
    // STEP 1: Handle block membership cleanup
    // ============================================
    
    // Check if student is in a block
    const { data: blockMembership } = await supabaseAdmin
      .from('block_members')
      .select('block_id, is_leader')
      .eq('student_id', studentId)
      .maybeSingle()

    if (blockMembership) {
      const blockId = blockMembership.block_id
      const wasLeader = blockMembership.is_leader

      // Remove student from block_members
      await supabaseAdmin
        .from('block_members')
        .delete()
        .eq('student_id', studentId)

      // Check how many members remain in the block
      const { data: remainingMembers } = await supabaseAdmin
        .from('block_members')
        .select('student_id, is_leader')
        .eq('block_id', blockId)

      if (!remainingMembers || remainingMembers.length === 0) {
        // Block is now empty - delete it entirely
        console.log(`Block ${blockId} is now empty, deleting...`)
        
        // First, clear block_id from any room_assignments that reference this block
        await supabaseAdmin
          .from('room_assignments')
          .update({ block_id: null })
          .eq('block_id', blockId)

        // Then delete the block
        await supabaseAdmin
          .from('student_blocks')
          .delete()
          .eq('block_id', blockId)
      } else {
        // Block still has members
        if (wasLeader) {
          // Transfer leadership to another member
          const newLeader = remainingMembers[0]
          console.log(`Transferring leadership of block ${blockId} to ${newLeader.student_id}`)
          
          await supabaseAdmin
            .from('block_members')
            .update({ is_leader: true })
            .eq('block_id', blockId)
            .eq('student_id', newLeader.student_id)

          // Update block_leader_id in student_blocks
          await supabaseAdmin
            .from('student_blocks')
            .update({ block_leader_id: newLeader.student_id })
            .eq('block_id', blockId)
        }

        // Update block capacity to reflect actual member count
        await supabaseAdmin
          .from('student_blocks')
          .update({ current_capacity: remainingMembers.length })
          .eq('block_id', blockId)
      }
    }

    // ============================================
    // STEP 2: Delete room assignment
    // ============================================
    const { error: assignmentError } = await supabaseAdmin
      .from('room_assignments')
      .delete()
      .eq('student_id', studentId)

    if (assignmentError) {
      console.error('Error deleting room assignment:', assignmentError)
    }

    // ============================================
    // STEP 3: Delete student preferences
    // ============================================
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