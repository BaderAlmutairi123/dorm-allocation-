import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

/**
 * GET /api/matching/status
 * 
 * Get current matching status - pending students, available rooms, etc.
 */
export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Admin client not available' },
        { status: 500 }
      )
    }

    // Get pending students count
    const { count: pendingCount, error: pendingError } = await supabaseAdmin
      .from('room_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Pending')

    if (pendingError) {
      throw new Error(`Failed to fetch pending assignments: ${pendingError.message}`)
    }

    // Get assigned students count (using 'Confirmed' status)
    const { count: assignedCount, error: assignedError } = await supabaseAdmin
      .from('room_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Confirmed')

    if (assignedError) {
      throw new Error(`Failed to fetch assigned count: ${assignedError.message}`)
    }

    // Get available rooms count (rooms where current_occupancy < max_capacity)
    // We need to fetch all rooms and filter, as there's no is_available column
    const { data: allRooms, error: roomsError } = await supabaseAdmin
      .from('rooms')
      .select('current_occupancy, max_capacity')

    let availableRoomsCount = 0
    if (!roomsError && allRooms) {
      availableRoomsCount = allRooms.filter(
        room => (room.current_occupancy || 0) < (room.max_capacity || 0)
      ).length
    }

    if (roomsError) {
      throw new Error(`Failed to fetch rooms: ${roomsError.message}`)
    }

    // Get total rooms count
    const { count: totalRoomsCount, error: totalRoomsError } = await supabaseAdmin
      .from('rooms')
      .select('*', { count: 'exact', head: true })

    if (totalRoomsError) {
      throw new Error(`Failed to fetch total rooms: ${totalRoomsError.message}`)
    }

    // Get blocks count - try both table names
    let blocksCount = 0
    const { count: blocksCount1, error: blocksError1 } = await supabaseAdmin
      .from('student_blocks')
      .select('*', { count: 'exact', head: true })

    if (blocksError1) {
      const { count: blocksCount2, error: blocksError2 } = await supabaseAdmin
        .from('blocks')
        .select('*', { count: 'exact', head: true })

      if (!blocksError2) {
        blocksCount = blocksCount2 || 0
      }
    } else {
      blocksCount = blocksCount1 || 0
    }

    // Get pending students without blocks (for retroactive matching)
    const { count: pendingWithoutBlocks, error: pendingWithoutBlocksError } = await supabaseAdmin
      .from('room_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Pending')
      .is('block_id', null)

    return NextResponse.json({
      pendingStudents: pendingCount || 0,
      assignedStudents: assignedCount || 0,
      availableRooms: availableRoomsCount || 0,
      totalRooms: totalRoomsCount || 0,
      blocks: blocksCount || 0,
      pendingWithoutBlocks: pendingWithoutBlocks || 0,
      canRunMatching: (pendingCount || 0) > 0 && (availableRoomsCount || 0) > 0,
      canAutoMatchBlocks: (pendingWithoutBlocks || 0) > 0,
    })
  } catch (error: any) {
    console.error('Error getting matching status:', error)
    return NextResponse.json(
      {
        error: 'Failed to get matching status',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
