import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'

/**
 * DELETE /api/blocks/[blockId]
 * Leave a block
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { blockId: string } }
) {
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

    const blockId = parseInt(params.blockId)

    if (isNaN(blockId)) {
      return NextResponse.json(
        { error: 'Invalid block ID' },
        { status: 400 }
      )
    }

    // Check if user is in this block
    const { data: membership, error: membershipError } = await supabase
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
      const { data: otherMembers, error: membersError } = await supabase
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
        await supabase
          .from('block_members')
          .update({ is_leader: true })
          .eq('block_id', blockId)
          .eq('student_id', newLeaderId)

        await supabase
          .from('student_blocks')
          .update({ block_leader_id: newLeaderId })
          .eq('block_id', blockId)
      } else {
        // No other members, delete the block
        await supabase
          .from('student_blocks')
          .delete()
          .eq('block_id', blockId)
      }
    }

    // Remove user from block
    const { error: deleteError } = await supabase
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
    const { data: block } = await supabase
      .from('student_blocks')
      .select('current_capacity')
      .eq('block_id', blockId)
      .single()

    if (block) {
      await supabase
        .from('student_blocks')
        .update({ current_capacity: Math.max(0, block.current_capacity - 1) })
        .eq('block_id', blockId)
    }

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

