import { NextResponse } from 'next/server'
import { calculateCompatibility } from '@/lib/matching/algorithm'
import { supabaseAdmin } from '@/lib/supabase/server'

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

    // Get both students
    const { data: students, error: studentsError } = await supabaseAdmin
      .from('students')
      .select('*')
      .in('student_id', [student1Id, student2Id])

    let studentsData = students
    if (studentsError || !students || students.length !== 2) {
      // Try with student_uuid
      const { data: studentsAlt, error: altError } = await supabaseAdmin
        .from('students')
        .select('*')
        .in('student_uuid', [student1Id, student2Id])

      if (altError || !studentsAlt || studentsAlt.length !== 2) {
        return NextResponse.json(
          { error: `Failed to fetch students: ${studentsError?.message || altError?.message}` },
          { status: 500 }
        )
      }
      studentsData = studentsAlt
    }

    // Get preferences
    const { data: preferences, error: prefError } = await supabaseAdmin
      .from('student_preferences')
      .select('*')
      .in('student_id', [student1Id, student2Id])

    let preferencesData = preferences
    if (prefError) {
      const { data: prefAlt } = await supabaseAdmin
        .from('student_preferences')
        .select('*')
        .in('student_uuid', [student1Id, student2Id])
      preferencesData = prefAlt
    }

    // Format students with preferences
    const studentsWithPrefs = studentsData.map((s: any) => {
      const studentId = s.student_id || s.student_uuid || s.id
      const pref = preferencesData?.find((p: any) => 
        (p.student_id === studentId) || (p.student_uuid === studentId)
      )

      return {
        student_id: studentId,
        first_name: s.first_name,
        last_name: s.last_name,
        email: s.email,
        gender: s.gender,
        year_level: s.year_level,
        major: s.major,
        preferences: pref ? {
          preferred_room_type: pref.preferred_room_type,
          bedtime: pref.bedtime,
          noise_level: pref.noise_level,
          cleanliness_level: pref.cleanliness_level,
          guest_policy_preference: pref.guest_policy_preference,
        } : null,
      }
    })

    const student1 = studentsWithPrefs.find((s: any) => 
      (s.student_id === student1Id) || (s.student_id === student1Id)
    )
    const student2 = studentsWithPrefs.find((s: any) => 
      (s.student_id === student2Id) || (s.student_id === student2Id)
    )

    if (!student1 || !student2) {
      return NextResponse.json(
        { error: 'One or both students not found' },
        { status: 404 }
      )
    }

    // Calculate compatibility
    const compatibility = calculateCompatibility(student1, student2)

    return NextResponse.json({
      student1: {
        id: student1.student_id,
        name: `${student1.first_name} ${student1.last_name}`,
        email: student1.email,
        major: student1.major,
      },
      student2: {
        id: student2.student_id,
        name: `${student2.first_name} ${student2.last_name}`,
        email: student2.email,
        major: student2.major,
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

