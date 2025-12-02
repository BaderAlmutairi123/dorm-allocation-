import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { calculateCompatibility } from '@/lib/matching/algorithm'

/**
 * POST /api/matching/auto-match-blocks
 * 
 * Retroactively matches existing pending students into blocks based on compatibility.
 * This can be run to process applications that were submitted before auto-matching was implemented.
 */
export async function POST() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Admin client not available. Please set SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 500 }
      )
    }

    // Get all pending students not in blocks
    const { data: pendingAssignments, error: assignError } = await supabaseAdmin
      .from('room_assignments')
      .select('student_id')
      .eq('status', 'Pending')
      .is('block_id', null)

    if (assignError) {
      return NextResponse.json(
        { error: 'Failed to fetch pending assignments', details: assignError.message },
        { status: 500 }
      )
    }

    if (!pendingAssignments || pendingAssignments.length === 0) {
      return NextResponse.json(
        {
          message: 'No pending students without blocks found',
          matched: 0,
          blocksCreated: 0,
        },
        { status: 200 }
      )
    }

    const pendingStudentIds = pendingAssignments.map(a => a.student_id)

    // Get all student data
    const { data: students, error: studentsError } = await supabaseAdmin
      .from('students')
      .select('student_id, first_name, last_name, email, gender, year_level, major')
      .in('student_id', pendingStudentIds)

    if (studentsError || !students) {
      return NextResponse.json(
        { error: 'Failed to fetch students', details: studentsError?.message },
        { status: 500 }
      )
    }

    // Get all preferences
    const { data: allPreferences, error: prefError } = await supabaseAdmin
      .from('student_preferences')
      .select('*')
      .in('student_id', pendingStudentIds)

    if (prefError) {
      console.warn('Failed to fetch some preferences:', prefError.message)
    }

    // Build student objects with preferences
    const studentsWithPrefs = students.map(student => {
      const pref = allPreferences?.find(p => p.student_id === student.student_id) || null
      return {
        student_id: student.student_id,
        first_name: student.first_name,
        last_name: student.last_name,
        email: student.email,
        gender: student.gender,
        year_level: String(student.year_level || ''),
        major: student.major,
        preferences: pref
      }
    })

    // Group students by gender
    const studentsByGender = new Map<string, typeof studentsWithPrefs>()
    studentsWithPrefs.forEach(student => {
      const gender = student.gender || 'Other'
      if (!studentsByGender.has(gender)) {
        studentsByGender.set(gender, [])
      }
      studentsByGender.get(gender)!.push(student)
    })

    let totalMatched = 0
    let blocksCreated = 0
    const processedStudentIds = new Set<string>()

    // Process each gender group
    for (const [gender, genderStudents] of studentsByGender.entries()) {
      // Calculate compatibility matrix for this gender group
      const compatibilityMatrix = new Map<string, Map<string, number>>()
      
      for (let i = 0; i < genderStudents.length; i++) {
        for (let j = i + 1; j < genderStudents.length; j++) {
          if (processedStudentIds.has(genderStudents[i].student_id) || 
              processedStudentIds.has(genderStudents[j].student_id)) {
            continue // Skip if already processed
          }

          const score = calculateCompatibility(genderStudents[i], genderStudents[j])
          
          if (!compatibilityMatrix.has(genderStudents[i].student_id)) {
            compatibilityMatrix.set(genderStudents[i].student_id, new Map())
          }
          compatibilityMatrix.get(genderStudents[i].student_id)!.set(
            genderStudents[j].student_id, 
            score.score
          )
        }
      }

      // Find best matches and create blocks
      const remainingStudents = genderStudents.filter(
        s => !processedStudentIds.has(s.student_id)
      )

      while (remainingStudents.length >= 2) {
        let bestScore = 0
        let bestPair: [typeof studentsWithPrefs[0], typeof studentsWithPrefs[0]] | null = null

        // Find the best unmatched pair
        for (let i = 0; i < remainingStudents.length; i++) {
          for (let j = i + 1; j < remainingStudents.length; j++) {
            const student1 = remainingStudents[i]
            const student2 = remainingStudents[j]
            
            const score = compatibilityMatrix.get(student1.student_id)?.get(student2.student_id) || 0
            
            if (score >= 60 && score > bestScore) {
              bestScore = score
              bestPair = [student1, student2]
            }
          }
        }

        if (!bestPair || bestScore < 60) {
          break // No more good matches
        }

        // Create a block for this pair
        const blockCode = `BLK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
        
        const { data: newBlock, error: blockError } = await supabaseAdmin
          .from('student_blocks')
          .insert({ code: blockCode })
          .select('block_id')
          .single()

        if (blockError || !newBlock) {
          console.error('Error creating block:', blockError)
          break
        }

        const blockId = newBlock.block_id
        blocksCreated++

        // Add both students to the block
        await supabaseAdmin
          .from('block_members')
          .insert([
            { block_id: blockId, student_id: bestPair[0].student_id },
            { block_id: blockId, student_id: bestPair[1].student_id }
          ])

        // Update room assignments
        await supabaseAdmin
          .from('room_assignments')
          .update({ block_id: blockId })
          .in('student_id', [bestPair[0].student_id, bestPair[1].student_id])
          .eq('status', 'Pending')

        processedStudentIds.add(bestPair[0].student_id)
        processedStudentIds.add(bestPair[1].student_id)
        totalMatched += 2

        // Remove from remaining students
        const index1 = remainingStudents.findIndex(s => s.student_id === bestPair[0].student_id)
        const index2 = remainingStudents.findIndex(s => s.student_id === bestPair[1].student_id)
        if (index1 > -1) remainingStudents.splice(index1, 1)
        if (index2 > -1 && index2 > index1) remainingStudents.splice(index2 - 1, 1)
        else if (index2 > -1) remainingStudents.splice(index2, 1)

        // Try to add more compatible students to this block (up to 8 total)
        let blockSize = 2
        const blockStudentIds = [bestPair[0].student_id, bestPair[1].student_id]

        while (blockSize < 8 && remainingStudents.length > 0) {
          let bestAdditional: typeof studentsWithPrefs[0] | null = null
          let bestAdditionalScore = 0

          // Find best additional student for this block
          for (const candidate of remainingStudents) {
            // Calculate average compatibility with all current block members
            let totalScore = 0
            let count = 0

            for (const blockStudentId of blockStudentIds) {
              const candidateStudent = studentsWithPrefs.find(s => s.student_id === blockStudentId)
              if (candidateStudent) {
                const score = compatibilityMatrix.get(candidateStudent.student_id)?.get(candidate.student_id) ||
                             compatibilityMatrix.get(candidate.student_id)?.get(candidateStudent.student_id) || 0
                totalScore += score
                count++
              }
            }

            const avgScore = count > 0 ? totalScore / count : 0

            if (avgScore >= 60 && avgScore > bestAdditionalScore) {
              bestAdditionalScore = avgScore
              bestAdditional = candidate
            }
          }

          if (!bestAdditional) {
            break // No more compatible students for this block
          }

          // Add to block
          await supabaseAdmin
            .from('block_members')
            .insert({ block_id: blockId, student_id: bestAdditional.student_id })

          await supabaseAdmin
            .from('room_assignments')
            .update({ block_id: blockId })
            .eq('student_id', bestAdditional.student_id)
            .eq('status', 'Pending')

          blockStudentIds.push(bestAdditional.student_id)
          processedStudentIds.add(bestAdditional.student_id)
          totalMatched++

          // Remove from remaining
          const index = remainingStudents.findIndex(s => s.student_id === bestAdditional!.student_id)
          if (index > -1) remainingStudents.splice(index, 1)

          blockSize++
        }
      }
    }

    return NextResponse.json(
      {
        message: `Successfully matched ${totalMatched} students into ${blocksCreated} blocks`,
        matched: totalMatched,
        blocksCreated: blocksCreated,
        remaining: pendingStudentIds.length - totalMatched,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error in auto-matching blocks:', error)
    return NextResponse.json(
      {
        error: 'Failed to auto-match blocks',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/matching/auto-match-blocks
 * 
 * Get statistics about pending students without blocks
 */
export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Admin client not available' },
        { status: 500 }
      )
    }

    // Count pending students without blocks
    const { count, error } = await supabaseAdmin
      .from('room_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Pending')
      .is('block_id', null)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to get statistics', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        pendingWithoutBlocks: count || 0,
        message: `There are ${count || 0} pending students not yet in blocks. Use POST to match them.`,
      },
      { status: 200 }
    )
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Failed to get statistics',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

