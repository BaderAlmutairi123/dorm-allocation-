import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: { studentId: string } }
) {
  try {
    const { studentId } = params
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
    if (token) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      if (authError || !user || user.id !== studentId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    // Get room assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('room_assignments')
      .select('*, rooms(*, dorms(*))')
      .eq('student_id', studentId)
      .single()

    if (assignmentError) {
      // Check if it's just no assignment found
      if (assignmentError.code === 'PGRST116') {
        return NextResponse.json({
          status: 'Pending',
          assignment: null,
        })
      }
      return NextResponse.json(
        { error: 'Failed to fetch assignment', details: assignmentError.message },
        { status: 500 }
      )
    }

    // Get roommates if room is assigned
    let roommates: any[] = []
    if (assignment.room_id && assignment.status === 'Confirmed') {
      const { data: roommateAssignments } = await supabase
        .from('room_assignments')
        .select('student_id, students(first_name, last_name, email, major)')
        .eq('room_id', assignment.room_id)
        .eq('status', 'Confirmed')
        .neq('student_id', studentId)

      if (roommateAssignments) {
        roommates = roommateAssignments.map(ra => ({
          student_id: ra.student_id,
          ...ra.students,
        }))
      }
    }

    return NextResponse.json({
      status: assignment.status,
      assignment: {
        assignment_id: assignment.assignment_id,
        room_id: assignment.room_id,
        block_id: assignment.block_id,
        status: assignment.status,
        assignment_date: assignment.assignment_date,
        room: assignment.rooms ? {
          room_id: assignment.rooms.room_id,
          room_number: assignment.rooms.room_number,
          floor_number: assignment.rooms.floor_number,
          room_type: assignment.rooms.room_type,
          max_capacity: assignment.rooms.max_capacity,
          current_occupancy: assignment.rooms.current_occupancy,
          wants_suite_bathroom: assignment.rooms.wants_suite_bathroom,
          is_accessible: assignment.rooms.is_accessible,
          dorm: assignment.rooms.dorms ? {
            dorm_id: assignment.rooms.dorms.dorm_id,
            dorm_name: assignment.rooms.dorms.dorm_name,
            address: assignment.rooms.dorms.address,
            dorm_gender: assignment.rooms.dorms.dorm_gender,
            dorm_type: assignment.rooms.dorms.dorm_type,
          } : null,
        } : null,
        roommates,
      },
    })
  } catch (error: any) {
    console.error('Error fetching assignment:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

