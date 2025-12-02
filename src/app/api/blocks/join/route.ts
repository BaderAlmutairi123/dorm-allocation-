import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Admin client for bypassing RLS when needed
const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null

/**
 * POST /api/blocks/join
 * Join a block by code
 */
export async function POST(request: NextRequest) {
  try {
    // Get auth token
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Use admin client if available for bypassing RLS
    const dbClient = supabaseAdmin || supabase

    const body = await request.json()
    const { code } = body

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Block code is required' },
        { status: 400 }
      )
    }

    // Check if user is already in a block
    const { data: existingMembership } = await dbClient
      .from('block_members')
      .select('block_id')
      .eq('student_id', user.id)
      .maybeSingle()

    if (existingMembership) {
      return NextResponse.json(
        { error: 'You are already in a block. Please leave your current block first.' },
        { status: 400 }
      )
    }

    // Find block by code
    const { data: block, error: blockError } = await dbClient
      .from('student_blocks')
      .select('*')
      .eq('code', code.toUpperCase())
      .single()

    if (blockError || !block) {
      return NextResponse.json(
        { error: 'Invalid block code. Please check and try again.' },
        { status: 404 }
      )
    }

    // Check if block is full
    if (block.current_capacity >= block.max_capacity) {
      return NextResponse.json(
        { error: 'This block is full.' },
        { status: 400 }
      )
    }

    // Add user to block
    const { error: memberError } = await dbClient
      .from('block_members')
      .insert({
        block_id: block.block_id,
        student_id: user.id,
        is_leader: false,
        joined_date: new Date().toISOString().split('T')[0],
      })

    if (memberError) {
      return NextResponse.json(
        { error: `Failed to join block: ${memberError.message}` },
        { status: 500 }
      )
    }

    // Update block capacity by counting actual members
    const { data: allMembers } = await dbClient
      .from('block_members')
      .select('student_id')
      .eq('block_id', block.block_id)

    await dbClient
      .from('student_blocks')
      .update({ current_capacity: allMembers?.length || 1 })
      .eq('block_id', block.block_id)

    // Find the block leader's room assignment and update joining student's assignment
    const { data: blockLeader } = await dbClient
      .from('block_members')
      .select('student_id')
      .eq('block_id', block.block_id)
      .eq('is_leader', true)
      .maybeSingle()

    if (blockLeader) {
      // Get the leader's room assignment
      const { data: leaderAssignment } = await dbClient
        .from('room_assignments')
        .select('room_id, status, block_id')
        .eq('student_id', blockLeader.student_id)
        .maybeSingle()

      // Check if the joining student has an existing room assignment
      const { data: existingAssignment } = await dbClient
        .from('room_assignments')
        .select('assignment_id')
        .eq('student_id', user.id)
        .maybeSingle()

      if (leaderAssignment && leaderAssignment.room_id) {
        // Leader has a room - update joining student to same room
        if (existingAssignment) {
          // Update existing assignment to match leader's room
          await dbClient
            .from('room_assignments')
            .update({
              block_id: block.block_id,
              room_id: leaderAssignment.room_id,
              status: leaderAssignment.status === 'Confirmed' ? 'Confirmed' : 'Pending',
            })
            .eq('student_id', user.id)
        } else {
          // Create new assignment matching leader's room
          await dbClient
            .from('room_assignments')
            .insert({
              student_id: user.id,
              block_id: block.block_id,
              room_id: leaderAssignment.room_id,
              status: leaderAssignment.status === 'Confirmed' ? 'Confirmed' : 'Pending',
            })
        }
      } else {
        // Leader doesn't have a room yet - just set block_id
        if (existingAssignment) {
          await dbClient
            .from('room_assignments')
            .update({ block_id: block.block_id })
            .eq('student_id', user.id)
        } else {
          await dbClient
            .from('room_assignments')
            .insert({
              student_id: user.id,
              block_id: block.block_id,
              status: 'Pending',
            })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully joined block',
      block: {
        id: String(block.block_id),
        code: block.code,
      }
    })
  } catch (error: any) {
    console.error('Error joining block:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

