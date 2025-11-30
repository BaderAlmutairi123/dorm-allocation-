import { NextResponse } from 'next/server'
import { supabaseAdmin, supabaseServer } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = supabaseAdmin || supabaseServer

    // Get all dorms with room statistics
    const { data: dorms, error: dormsError } = await supabase
      .from('dorms')
      .select('*')
      .order('dorm_name')

    if (dormsError) {
      return NextResponse.json(
        { error: 'Failed to fetch buildings', details: dormsError.message },
        { status: 500 }
      )
    }

    // Get room statistics for each dorm
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('dorm_id, room_id, max_capacity, current_occupancy')

    if (roomsError) {
      return NextResponse.json(
        { error: 'Failed to fetch room statistics', details: roomsError.message },
        { status: 500 }
      )
    }

    // Calculate statistics for each dorm
    const buildings = (dorms || []).map((dorm: any) => {
      const dormRooms = (rooms || []).filter((r: any) => r.dorm_id === dorm.dorm_id)
      const totalRooms = dormRooms.length
      const totalCapacity = dormRooms.reduce((sum: number, r: any) => sum + (r.max_capacity || 0), 0)
      const totalOccupied = dormRooms.reduce((sum: number, r: any) => sum + (r.current_occupancy || 0), 0)
      const availableRooms = dormRooms.filter((r: any) => (r.current_occupancy || 0) < (r.max_capacity || 0)).length

      return {
        dorm_id: dorm.dorm_id,
        dorm_name: dorm.dorm_name,
        address: dorm.address,
        dorm_gender: dorm.dorm_gender,
        dorm_type: dorm.dorm_type,
        statistics: {
          total_rooms: totalRooms,
          total_capacity: totalCapacity,
          total_occupied: totalOccupied,
          total_available: totalCapacity - totalOccupied,
          available_rooms: availableRooms,
          occupancy_percentage: totalCapacity > 0 
            ? Math.round((totalOccupied / totalCapacity) * 100) 
            : 0,
        },
      }
    })

    return NextResponse.json({
      buildings,
      count: buildings.length,
    })
  } catch (error: any) {
    console.error('Error fetching buildings:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

