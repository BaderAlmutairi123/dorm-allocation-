import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'

/**
 * GET /api/students/search
 * Search for students (for roommate search)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '20')

    // Build query - search by name, major, or email
    let studentsQuery = supabase
      .from('students')
      .select(`
        student_id,
        first_name,
        last_name,
        email,
        major,
        year_level,
        gender
      `)
      .neq('student_id', user.id) // Exclude current user
      .limit(limit)

    if (query.trim()) {
      // Search in name, major, or email
      studentsQuery = studentsQuery.or(
        `first_name.ilike.%${query}%,last_name.ilike.%${query}%,major.ilike.%${query}%,email.ilike.%${query}%`
      )
    }

    const { data: students, error: studentsError } = await studentsQuery

    if (studentsError) {
      return NextResponse.json(
        { error: `Failed to search students: ${studentsError.message}` },
        { status: 500 }
      )
    }

    // Format response
    const formattedStudents = (students || []).map(student => ({
      id: student.student_id,
      name: `${student.first_name} ${student.last_name}`,
      email: student.email,
      major: student.major || 'Undeclared',
      year: ['Freshman', 'Sophomore', 'Junior', 'Senior'][(student.year_level || 1) - 1] || 'Freshman',
      gender: student.gender || 'Other',
    }))

    return NextResponse.json({
      students: formattedStudents,
    })
  } catch (error: any) {
    console.error('Error searching students:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

