import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId: student_id } = await params
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
      if (authError || !user || user.id !== student_id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    // Get room assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('room_assignments')
      .select('*')
      .eq('student_id', student_id)
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

    // Fetch room data separately (the join doesn't work well with "room.id" column name)
    let roomData: any = null
    let dormData: any = null
    
    if (assignment.room_id) {
      // Try different ways to query the room since column name has a dot
      let room = null
      
      // First try: use the column name with quotes via RPC or raw query
      const { data: rooms } = await supabase
        .from('rooms')
        .select('*')
      
      // Find the room by matching the room.id column
      if (rooms) {
        room = rooms.find((r: any) => {
          const roomId = r['room.id'] || r.room_id || r.id
          return roomId === assignment.room_id || roomId === parseInt(assignment.room_id)
        })
      }
      
      if (room) {
        roomData = room
        
        // Fetch dorm data
        const dormId = room.dorm_id
        if (dormId) {
          const { data: allDorms } = await supabase
            .from('dorms')
            .select('*')
          
          // Try to find the dorm - the ID column might have a different name
          const dorm = allDorms?.find((d: any) => {
            const id = d.dorm_id || d['dorm.id'] || d.id
            return id === dormId || id === parseInt(dormId)
          })
          
          if (dorm) {
            dormData = dorm
          }
        }
      }
    }

    // Get roommates if room is assigned
    let roommates: any[] = []
    if (assignment.room_id && assignment.status === 'Confirmed') {
      const { data: roommateAssignments } = await supabase
        .from('room_assignments')
        .select('student_id, students(first_name, last_name, email, major)')
        .eq('room_id', assignment.room_id)
        .eq('status', 'Confirmed')
        .neq('student_id', student_id)

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
        room: roomData ? {
          room_id: roomData['room.id'] || roomData.room_id,
          room_number: roomData.room_number,
          floor_number: roomData.floor_number,
          room_type: roomData.room_type,
          max_capacity: roomData.max_capacity,
          current_occupancy: roomData.current_occupancy,
          wants_suite_bathroom: roomData.wants_suite_bathroom,
          is_accessible: roomData.is_accessible,
          dorm: dormData ? {
            dorm_id: dormData.dorm_id,
            dorm_name: dormData.dorm_name,
            address: dormData.address,
            dorm_gender: dormData.dorm_gender,
            dorm_type: dormData.dorm_type,
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

