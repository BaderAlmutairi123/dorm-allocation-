import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

// GET - Get user's current block
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')

    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Get the block member record for this student
    const { data: memberData, error: memberError } = await supabaseAdmin
      .from('block_members')
      .select('block_id, is_leader, joined_date')
      .eq('student_id', studentId)
      .maybeSingle()

    if (memberError && memberError.code !== 'PGRST116') {
      console.error('Error fetching block member:', memberError)
      return NextResponse.json(
        { error: 'Failed to fetch block membership' },
        { status: 500 }
      )
    }

    // If user is not in any block
    if (!memberData) {
      return NextResponse.json({ block: null })
    }

    // Get the block details
    const { data: blockData, error: blockError } = await supabaseAdmin
      .from('student_blocks')
      .select('block_id, block_leader_id, max_capacity, current_capacity')
      .eq('block_id', memberData.block_id)
      .single()

    if (blockError) {
      console.error('Error fetching block:', blockError)
      return NextResponse.json(
        { error: 'Failed to fetch block details' },
        { status: 500 }
      )
    }

    // Get all members of the block
    const { data: membersData, error: membersError } = await supabaseAdmin
      .from('block_members')
      .select(`
        student_id,
        is_leader,
        students!inner(student_id, first_name, last_name, email)
      `)
      .eq('block_id', memberData.block_id)

    if (membersError) {
      console.error('Error fetching block members:', membersError)
      return NextResponse.json(
        { error: 'Failed to fetch block members' },
        { status: 500 }
      )
    }

    // Format the response
    interface MemberWithLeader {
      id: string
      name: string
      email: string
      isLeader: boolean
    }

    const members: MemberWithLeader[] = membersData.map((member) => ({
      id: member.student_id,
      name: `${member.students.first_name} ${member.students.last_name}`,
      email: member.students.email,
      isLeader: member.is_leader,
    }))

    const leader = members.find((m) => m.id === blockData.block_leader_id)

    const block = {
      id: blockData.block_id.toString(),
      code: `BLK${blockData.block_id.toString().padStart(4, '0')}`,
      creator: leader || members[0],
      members: members.map(({ isLeader: _, ...m }) => m),
      maxMembers: blockData.max_capacity,
    }

    return NextResponse.json({ block })
  } catch (error) {
    console.error('Error in GET /api/blocks:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a new block or join existing block
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, studentId, firstName, lastName, email, code } = body

    if (!studentId || !firstName || !lastName || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Check if student has requested a single room
    const { data: preferences, error: prefError } = await supabaseAdmin
      .from('student_preferences')
      .select('preferred_room_type')
      .eq('student_id', studentId)
      .maybeSingle()

    if (prefError && prefError.code !== 'PGRST116') {
      console.error('Error checking student preferences:', prefError)
    }

    // If student has selected a single room, they cannot create/join blocks
    if (preferences && preferences.preferred_room_type === 'Single') {
      return NextResponse.json(
        { error: 'You have requested a single room and cannot join or create a block. Students in blocks are assigned to shared rooms.' },
        { status: 400 }
      )
    }

    // Check if student is already in a block
    const { data: existingMember, error: checkError } = await supabaseAdmin
      .from('block_members')
      .select('block_id')
      .eq('student_id', studentId)
      .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing membership:', checkError)
      return NextResponse.json(
        { error: 'Failed to check block membership' },
        { status: 500 }
      )
    }

    if (existingMember) {
      return NextResponse.json(
        { error: 'You are already in a block. Leave your current block to create a new one.' },
        { status: 400 }
      )
    }

    if (action === 'create') {
      // Determine max capacity based on room type preference
      let maxCapacity = 4 // Default for Suite (3-4 people)
      if (preferences?.preferred_room_type === 'Double') {
        maxCapacity = 2
      }

      // Create a new block
      const { data: newBlock, error: blockError } = await supabaseAdmin
        .from('student_blocks')
        .insert({
          block_leader_id: studentId,
          max_capacity: maxCapacity,
          current_capacity: 1,
        })
        .select()
        .single()

      if (blockError) {
        console.error('Error creating block:', blockError)
        return NextResponse.json(
          { error: 'Failed to create block' },
          { status: 500 }
        )
      }

      // Add creator as first member
      const { error: memberError } = await supabaseAdmin
        .from('block_members')
        .insert({
          block_id: newBlock.block_id,
          student_id: studentId,
          is_leader: true,
        })

      if (memberError) {
        console.error('Error adding block leader:', memberError)
        // Rollback: delete the block
        await supabaseAdmin
          .from('student_blocks')
          .delete()
          .eq('block_id', newBlock.block_id)

        return NextResponse.json(
          { error: 'Failed to add member to block' },
          { status: 500 }
        )
      }

      // Return the created block
      const block = {
        id: newBlock.block_id.toString(),
        code: `BLK${newBlock.block_id.toString().padStart(4, '0')}`,
        creator: {
          id: studentId,
          name: `${firstName} ${lastName}`,
          email,
        },
        members: [{
          id: studentId,
          name: `${firstName} ${lastName}`,
          email,
        }],
        maxMembers: 4,
      }

      return NextResponse.json({ block }, { status: 201 })

    } else if (action === 'join') {
      if (!code) {
        return NextResponse.json(
          { error: 'Block code is required' },
          { status: 400 }
        )
      }

      // Extract block_id from code (format: BLK0001)
      const blockId = parseInt(code.replace('BLK', ''))

      if (isNaN(blockId)) {
        return NextResponse.json(
          { error: 'Invalid block code format' },
          { status: 400 }
        )
      }

      // Get the block
      const { data: targetBlock, error: blockError } = await supabaseAdmin
        .from('student_blocks')
        .select('block_id, block_leader_id, max_capacity, current_capacity')
        .eq('block_id', blockId)
        .maybeSingle()

      if (blockError || !targetBlock) {
        console.error('Error fetching target block:', blockError)
        return NextResponse.json(
          { error: 'Block not found. Check the code or ask the owner.' },
          { status: 404 }
        )
      }

      // Check if student is trying to join their own block
      if (targetBlock.block_leader_id === studentId) {
        return NextResponse.json(
          { error: 'You created this block. You are already the leader.' },
          { status: 400 }
        )
      }

      // Check if room preferences match the block capacity
      const joinerRoomType = preferences?.preferred_room_type
      const blockCapacity = targetBlock.max_capacity

      // Validate room preference compatibility
      if (joinerRoomType === 'Double' && blockCapacity !== 2) {
        return NextResponse.json(
          { error: 'This block is for Suite rooms. You have requested a Double room. Please join a Double block or update your room preference.' },
          { status: 400 }
        )
      }

      if (joinerRoomType === 'Suite' && blockCapacity === 2) {
        return NextResponse.json(
          { error: 'This block is for Double rooms. You have requested a Suite room. Please join a Suite block or update your room preference.' },
          { status: 400 }
        )
      }

      // Check if block is full
      if (targetBlock.current_capacity >= targetBlock.max_capacity) {
        const roomType = blockCapacity === 2 ? 'Double' : 'Suite'
        return NextResponse.json(
          { error: `This ${roomType} block is full (max ${blockCapacity} members). Please join a different block.` },
          { status: 400 }
        )
      }

      // Add member to block
      const { error: joinError } = await supabaseAdmin
        .from('block_members')
        .insert({
          block_id: targetBlock.block_id,
          student_id: studentId,
          is_leader: false,
        })

      if (joinError) {
        console.error('Error joining block:', joinError)
        return NextResponse.json(
          { error: 'Failed to join block' },
          { status: 500 }
        )
      }

      // Update block capacity
      const { error: updateError } = await supabaseAdmin
        .from('student_blocks')
        .update({ current_capacity: targetBlock.current_capacity + 1 })
        .eq('block_id', targetBlock.block_id)

      if (updateError) {
        console.error('Error updating block capacity:', updateError)
      }

      // Fetch updated block with all members
      const { data: membersData, error: membersError } = await supabaseAdmin
        .from('block_members')
        .select(`
          student_id,
          is_leader,
          students!inner(student_id, first_name, last_name, email)
        `)
        .eq('block_id', targetBlock.block_id)

      if (membersError) {
        console.error('Error fetching members:', membersError)
        return NextResponse.json(
          { error: 'Failed to fetch block members' },
          { status: 500 }
        )
      }

      interface BlockMember {
        id: string
        name: string
        email: string
      }

      const members: BlockMember[] = membersData.map((member) => ({
        id: member.student_id,
        name: `${member.students.first_name} ${member.students.last_name}`,
        email: member.students.email,
      }))

      const leader = members.find((m) => m.id === targetBlock.block_leader_id)

      const block = {
        id: targetBlock.block_id.toString(),
        code: `BLK${targetBlock.block_id.toString().padStart(4, '0')}`,
        creator: leader || members[0],
        members,
        maxMembers: targetBlock.max_capacity,
      }

      return NextResponse.json({ block }, { status: 200 })
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error in POST /api/blocks:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Leave a block
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')

    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Get the member's block
    const { data: memberData, error: memberError } = await supabaseAdmin
      .from('block_members')
      .select('block_id, is_leader')
      .eq('student_id', studentId)
      .maybeSingle()

    if (memberError || !memberData) {
      return NextResponse.json(
        { error: 'You are not in any block to leave.' },
        { status: 404 }
      )
    }

    const blockId = memberData.block_id

    // Remove the member
    const { error: deleteError } = await supabaseAdmin
      .from('block_members')
      .delete()
      .eq('student_id', studentId)
      .eq('block_id', blockId)

    if (deleteError) {
      console.error('Error removing member:', deleteError)
      return NextResponse.json(
        { error: 'Failed to leave block' },
        { status: 500 }
      )
    }

    // Check remaining members
    const { data: remainingMembers, error: countError } = await supabaseAdmin
      .from('block_members')
      .select('student_id, joined_date')
      .eq('block_id', blockId)
      .order('joined_date', { ascending: true })

    if (countError) {
      console.error('Error counting remaining members:', countError)
    }

    if (!remainingMembers || remainingMembers.length === 0) {
      // No members left, delete the block
      await supabaseAdmin
        .from('student_blocks')
        .delete()
        .eq('block_id', blockId)

      return NextResponse.json({
        success: true,
        message: 'You left the block, and it has been deleted since you were the only member.'
      })
    } else {
      // Update block capacity
      await supabaseAdmin
        .from('student_blocks')
        .update({ current_capacity: remainingMembers.length })
        .eq('block_id', blockId)

      // If the leader left, assign a new leader (first member who joined)
      if (memberData.is_leader && remainingMembers.length > 0) {
        const newLeaderId = remainingMembers[0].student_id

        await supabaseAdmin
          .from('student_blocks')
          .update({ block_leader_id: newLeaderId })
          .eq('block_id', blockId)

        await supabaseAdmin
          .from('block_members')
          .update({ is_leader: true })
          .eq('student_id', newLeaderId)
          .eq('block_id', blockId)

        // Get new leader info
        const { data: newLeaderData } = await supabaseAdmin
          .from('students')
          .select('first_name, last_name')
          .eq('student_id', newLeaderId)
          .single()

        return NextResponse.json({
          success: true,
          message: `You are no longer the owner. ${newLeaderData?.first_name} ${newLeaderData?.last_name} is now the leader.`,
          newLeaderId
        })
      }

      return NextResponse.json({
        success: true,
        message: 'You have left the block.'
      })
    }
  } catch (error) {
    console.error('Error in DELETE /api/blocks:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
