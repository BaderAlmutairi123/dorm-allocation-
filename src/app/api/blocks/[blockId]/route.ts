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
 * DELETE /api/blocks/[blockId]
 * Leave a block
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ blockId: string }> }
) {
  try {
    const { blockId: blockIdStr } = await params
    
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

    const blockId = parseInt(blockIdStr)

    if (isNaN(blockId)) {
      return NextResponse.json(
        { error: 'Invalid block ID' },
        { status: 400 }
      )
    }

    // Check if user is in this block
    const { data: membership, error: membershipError } = await dbClient
      .from('block_members')
      .select('is_leader')
      .eq('block_id', blockId)
      .eq('student_id', user.id)
      .maybeSingle()

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'You are not a member of this block' },
        { status: 404 }
      )
    }

    // If user is the leader, check if there are other members
    if (membership.is_leader) {
      const { data: otherMembers, error: membersError } = await dbClient
        .from('block_members')
        .select('student_id')
        .eq('block_id', blockId)
        .neq('student_id', user.id)

      if (membersError) {
        return NextResponse.json(
          { error: `Failed to check block members: ${membersError.message}` },
          { status: 500 }
        )
      }

      // If there are other members, transfer leadership to the first member
      if (otherMembers && otherMembers.length > 0) {
        const newLeaderId = otherMembers[0].student_id
        await dbClient
          .from('block_members')
          .update({ is_leader: true })
          .eq('block_id', blockId)
          .eq('student_id', newLeaderId)

        await dbClient
          .from('student_blocks')
          .update({ block_leader_id: newLeaderId })
          .eq('block_id', blockId)
      } else {
        // No other members, delete the block
        await dbClient
          .from('student_blocks')
          .delete()
          .eq('block_id', blockId)
      }
    }

    // Remove user from block
    const { error: deleteError } = await dbClient
      .from('block_members')
      .delete()
      .eq('block_id', blockId)
      .eq('student_id', user.id)

    if (deleteError) {
      return NextResponse.json(
        { error: `Failed to leave block: ${deleteError.message}` },
        { status: 500 }
      )
    }

    // Update block capacity
    const { data: block } = await dbClient
      .from('student_blocks')
      .select('current_capacity')
      .eq('block_id', blockId)
      .single()

    if (block) {
      await dbClient
        .from('student_blocks')
        .update({ current_capacity: Math.max(0, block.current_capacity - 1) })
        .eq('block_id', blockId)
    }

    // Reset the user's room assignment (remove block_id and room_id, set to Pending)
    await dbClient
      .from('room_assignments')
      .update({
        block_id: null,
        room_id: null,
        status: 'Pending',
      })
      .eq('student_id', user.id)

    return NextResponse.json({
      success: true,
      message: 'Successfully left block',
    })
  } catch (error: any) {
    console.error('Error leaving block:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

