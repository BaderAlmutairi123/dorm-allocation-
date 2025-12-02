import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, supabaseServer } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dormId = searchParams.get('dorm_id')
    const floor = searchParams.get('floor')
    const roomType = searchParams.get('room_type')
    const availableOnly = searchParams.get('available_only') === 'true'

    const supabase = supabaseAdmin || supabaseServer

    let query = supabase
      .from('rooms')
      .select('*, dorms(*)')
      .order('dorm_id')
      .order('floor_number')
      .order('room_number')

    if (dormId) {
      query = query.eq('dorm_id', dormId)
    }

    if (floor) {
      query = query.eq('floor_number', parseInt(floor))
    }

    if (roomType) {
      query = query.eq('room_type', roomType)
    }

    const { data: rooms, error } = await query

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch rooms', details: error.message },
        { status: 500 }
      )
    }

    // Filter available rooms if requested
    let filteredRooms = rooms || []
    if (availableOnly) {
      filteredRooms = filteredRooms.filter(
        (room: any) => (room.current_occupancy || 0) < (room.max_capacity || 0)
      )
    }

    // Format response
    const formattedRooms = filteredRooms.map((room: any) => ({
      room_id: room.room_id,
      room_number: room.room_number,
      floor_number: room.floor_number,
      room_type: room.room_type,
      max_capacity: room.max_capacity,
      current_occupancy: room.current_occupancy || 0,
      available_spots: room.max_capacity - (room.current_occupancy || 0),
      wants_suite_bathroom: room.wants_suite_bathroom,
      is_accessible: room.is_accessible,
      dorm: room.dorms ? {
        dorm_id: room.dorms.dorm_id,
        dorm_name: room.dorms.dorm_name,
        address: room.dorms.address,
        dorm_gender: room.dorms.dorm_gender,
        dorm_type: room.dorms.dorm_type,
      } : null,
    }))

    return NextResponse.json({
      rooms: formattedRooms,
      count: formattedRooms.length,
    })
  } catch (error: any) {
    console.error('Error fetching rooms:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

