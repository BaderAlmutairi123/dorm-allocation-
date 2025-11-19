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

    // Get assigned students count
    const { count: assignedCount, error: assignedError } = await supabaseAdmin
      .from('room_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Assigned')

    if (assignedError) {
      throw new Error(`Failed to fetch assigned count: ${assignedError.message}`)
    }

    // Get available rooms count
    const { count: availableRoomsCount, error: roomsError } = await supabaseAdmin
      .from('rooms')
      .select('*', { count: 'exact', head: true })
      .eq('is_available', true)

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

    // Get blocks count
    const { count: blocksCount, error: blocksError } = await supabaseAdmin
      .from('blocks')
      .select('*', { count: 'exact', head: true })

    if (blocksError) {
      // Blocks table might not exist, that's okay
      console.warn('Blocks table not found or error:', blocksError.message)
    }

    return NextResponse.json({
      pendingStudents: pendingCount || 0,
      assignedStudents: assignedCount || 0,
      availableRooms: availableRoomsCount || 0,
      totalRooms: totalRoomsCount || 0,
      blocks: blocksCount || 0,
      canRunMatching: (pendingCount || 0) > 0 && (availableRoomsCount || 0) > 0,
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

