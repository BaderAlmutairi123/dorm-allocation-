import { NextResponse } from 'next/server'
import { calculateCompatibility } from '@/lib/matching/algorithm'
import { supabaseAdmin } from '@/lib/supabase/server'

/**
 * GET /api/matching/compatibility?student1=id1&student2=id2
 * 
 * Calculate compatibility score between two students
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const student1Id = searchParams.get('student1')
    const student2Id = searchParams.get('student2')

    if (!student1Id || !student2Id) {
      return NextResponse.json(
        { error: 'Missing student1 or student2 parameters' },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Admin client not available' },
        { status: 500 }
      )
    }

    // Get both students - your schema uses student_uuid
    const { data: students, error: studentsError } = await supabaseAdmin
      .from('students')
      .select('*')
      .in('student_uuid', [student1Id, student2Id])

    let studentsData = students
    if (studentsError || !students || students.length !== 2) {
      // Try with 'student_id' for compatibility
      const { data: studentsAlt1, error: altError1 } = await supabaseAdmin
        .from('students')
        .select('*')
        .in('student_id', [student1Id, student2Id])

      if (altError1 || !studentsAlt1 || studentsAlt1.length !== 2) {
        // Try with 'id' as last resort
        const { data: studentsAlt2, error: altError2 } = await supabaseAdmin
          .from('students')
          .select('*')
          .in('id', [student1Id, student2Id])

        if (altError2 || !studentsAlt2 || studentsAlt2.length !== 2) {
          return NextResponse.json(
            { error: `Failed to fetch students: ${studentsError?.message || altError1?.message || altError2?.message}` },
            { status: 500 }
          )
        }

        studentsData = studentsAlt2.map(s => ({
          ...s,
          student_uuid: s.student_uuid || s.student_id || s.id,
        }))
      } else {
        studentsData = studentsAlt1.map(s => ({
          ...s,
          student_uuid: s.student_uuid || s.student_id || s.id,
        }))
      }
    }

    if (!studentsData || studentsData.length !== 2) {
      return NextResponse.json(
        { error: 'Could not find both students' },
        { status: 404 }
      )
    }

    const student1 = studentsData.find(s => (s.student_uuid || s.student_id || s.id) === student1Id)
    const student2 = studentsData.find(s => (s.student_uuid || s.student_id || s.id) === student2Id)

    if (!student1 || !student2) {
      return NextResponse.json(
        { error: 'Could not find both students' },
        { status: 404 }
      )
    }

    const student1Uuid = student1.student_uuid || student1.student_id || student1.id
    const student2Uuid = student2.student_uuid || student2.student_id || student2.id

    // Get preferences - your schema uses student_uuid
    const { data: preferences, error: prefError } = await supabaseAdmin
      .from('student_preferences')
      .select('*')
      .in('student_uuid', [student1Uuid, student2Uuid])

    if (prefError) {
      console.warn('Failed to fetch preferences:', prefError.message)
    }

    // Combine students with preferences
    const student1WithPrefs = {
      student_id: student1Uuid,
      first_name: student1.first_name,
      last_name: student1.last_name,
      email: student1.email,
      gender: student1.gender,
      year_level: student1.year_level,
      major: student1.major,
      preferences: preferences?.find(p => (p.student_uuid || p.student_id) === student1Uuid) || null,
    }

    const student2WithPrefs = {
      student_id: student2Uuid,
      first_name: student2.first_name,
      last_name: student2.last_name,
      email: student2.email,
      gender: student2.gender,
      year_level: student2.year_level,
      major: student2.major,
      preferences: preferences?.find(p => (p.student_uuid || p.student_id) === student2Uuid) || null,
    }

    const compatibility = calculateCompatibility(student1WithPrefs, student2WithPrefs)

    return NextResponse.json({
      student1: {
        id: student1WithPrefs.student_id,
        name: `${student1WithPrefs.first_name} ${student1WithPrefs.last_name}`,
      },
      student2: {
        id: student2WithPrefs.student_id,
        name: `${student2WithPrefs.first_name} ${student2WithPrefs.last_name}`,
      },
      compatibility,
    })
  } catch (error: any) {
    console.error('Error calculating compatibility:', error)
    return NextResponse.json(
      {
        error: 'Failed to calculate compatibility',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
