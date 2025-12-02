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
 * GET /api/blocks
 * Get the current user's block (if they're in one)
 */
export async function GET(request: NextRequest) {
  try {
    // Get auth token from cookies
    const authCookie = request.cookies.get('sb-access-token')?.value 
      || request.cookies.get('supabase-auth-token')?.value
    
    // Also try to get from Authorization header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || authCookie
    
    // Parse the auth cookie if it's JSON (Supabase stores session as JSON)
    let accessToken = token
    if (token && token.startsWith('[')) {
      try {
        const parsed = JSON.parse(token)
        accessToken = parsed[0] // First element is access token
      } catch (e) {
        // Not JSON, use as-is
      }
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
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

    // Check if user is in a block via block_members table
    let { data: membership, error: membershipError } = await dbClient
      .from('block_members')
      .select('block_id, is_leader')
      .eq('student_id', user.id)
      .maybeSingle()

    console.log(`Block membership check for user ${user.id}:`, { membership, error: membershipError?.message })

    if (membershipError) {
      console.error('Block membership error:', membershipError)
      return NextResponse.json(
        { error: `Failed to check block membership: ${membershipError.message}` },
        { status: 500 }
      )
    }

    // If not in block_members, check if they have a block_id in room_assignments
    // This handles cases where matching algorithm assigned a block but didn't add to block_members
    if (!membership) {
      const { data: assignment, error: assignmentError } = await dbClient
        .from('room_assignments')
        .select('block_id, room_id, status')
        .eq('student_id', user.id)
        .maybeSingle()

      console.log(`Room assignment check for user ${user.id}:`, { assignment, error: assignmentError?.message })

      if (!assignmentError && assignment?.block_id) {
        // User has a block_id in room_assignments but isn't in block_members
        // Add them to block_members to sync
        const { error: insertError } = await dbClient
          .from('block_members')
          .insert({
            block_id: assignment.block_id,
            student_id: user.id,
            is_leader: false,
            joined_date: new Date().toISOString().split('T')[0],
          })

        console.log(`Synced user ${user.id} to block_members:`, { insertError: insertError?.message })

        if (!insertError) {
          membership = { block_id: assignment.block_id, is_leader: false }
        }
      } else if (!assignmentError && assignment?.room_id && assignment?.status === 'Confirmed' && !assignment?.block_id) {
        // User has a confirmed room assignment but NO block - create one automatically
        console.log(`Creating automatic block for user ${user.id} with room assignment, room_id=${assignment.room_id}`)
        
        // Get room details to set block capacity
        // The column "room.id" has a dot in the name, so we fetch all and filter
        const { data: allRooms, error: roomError } = await dbClient
          .from('rooms')
          .select('*')
        
        // Find the room by matching room.id (the column name has a dot)
        const room = allRooms?.find((r: any) => {
          const roomId = r['room.id'] || r.id
          return roomId === assignment.room_id || String(roomId) === String(assignment.room_id)
        }) || null
        
        console.log(`Room lookup result:`, { 
          room_id: assignment.room_id, 
          found: !!room,
          room_type: room?.room_type,
          max_capacity: room?.max_capacity,
          error: roomError?.message 
        })
        
        // Use room's max_capacity, default to 2 for double rooms if not found
        const blockCapacity = room?.max_capacity || 2
        
        // Generate a unique block code
        const generateCode = () => {
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
          let code = ''
          for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length))
          }
          return code
        }
        
        const blockCode = generateCode()
        
        // Create a new block for this user
        const { data: newBlock, error: blockCreateError } = await dbClient
          .from('student_blocks')
          .insert({
            code: blockCode,
            max_capacity: blockCapacity,
            current_capacity: 1,
            block_leader_id: user.id,
          })
          .select('block_id')
          .single()
        
        if (!blockCreateError && newBlock) {
          // Add user to block_members
          await dbClient
            .from('block_members')
            .insert({
              block_id: newBlock.block_id,
              student_id: user.id,
              is_leader: true,
              joined_date: new Date().toISOString().split('T')[0],
            })
          
          // Update room_assignments with the new block_id
          await dbClient
            .from('room_assignments')
            .update({ block_id: newBlock.block_id })
            .eq('student_id', user.id)
          
          membership = { block_id: newBlock.block_id, is_leader: true }
          console.log(`Created block ${blockCode} for user ${user.id}`)
          
          // Also add any roommates to this block
          const { data: roommates } = await dbClient
            .from('room_assignments')
            .select('student_id')
            .eq('room_id', assignment.room_id)
            .eq('status', 'Confirmed')
            .neq('student_id', user.id)
          
          if (roommates && roommates.length > 0) {
            for (const roommate of roommates) {
              // Check if roommate is already in a block
              const { data: roommateBlock } = await dbClient
                .from('block_members')
                .select('block_id')
                .eq('student_id', roommate.student_id)
                .maybeSingle()
              
              if (!roommateBlock) {
                // Add roommate to this block
                await dbClient
                  .from('block_members')
                  .insert({
                    block_id: newBlock.block_id,
                    student_id: roommate.student_id,
                    is_leader: false,
                    joined_date: new Date().toISOString().split('T')[0],
                  })
                
                // Update roommate's assignment with block_id
                await dbClient
                  .from('room_assignments')
                  .update({ block_id: newBlock.block_id })
                  .eq('student_id', roommate.student_id)
                
                // Update block capacity
                await dbClient
                  .from('student_blocks')
                  .update({ current_capacity: (roommates.length + 1) })
                  .eq('block_id', newBlock.block_id)
                
                console.log(`Added roommate ${roommate.student_id} to block ${blockCode}`)
              }
            }
          }
        } else {
          console.error('Failed to create block:', blockCreateError?.message)
        }
      }
    }

    if (!membership) {
      console.log(`No block found for user ${user.id}`)
      return NextResponse.json({ block: null })
    }

    // Get block details
    const { data: block, error: blockError } = await dbClient
      .from('student_blocks')
      .select('*')
      .eq('block_id', membership.block_id)
      .single()

    if (blockError) {
      console.error('Block fetch error:', blockError)
      return NextResponse.json(
        { error: `Failed to fetch block: ${blockError.message}` },
        { status: 500 }
      )
    }

    // Get all block members with their student info
    const { data: members, error: membersError } = await dbClient
      .from('block_members')
      .select(`
        student_id,
        is_leader,
        joined_date,
        students:student_id (
          student_id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('block_id', membership.block_id)

    if (membersError) {
      console.error('Members fetch error:', membersError)
      return NextResponse.json(
        { error: `Failed to fetch members: ${membersError.message}` },
        { status: 500 }
      )
    }

    console.log(`Found block ${block.code} with ${members?.length || 0} members for user ${user.id}`)

    // Format the response
    const formattedMembers = (members || []).map((m: any) => {
      const student = m.students
      return {
        id: student?.student_id || m.student_id,
        name: student ? `${student.first_name} ${student.last_name}` : 'Unknown',
        email: student?.email || '',
        is_leader: m.is_leader || false,
      }
    })

    return NextResponse.json({
      block: {
        id: String(block.block_id),
        code: block.code || '',
        maxMembers: block.max_capacity || 4,
        members: formattedMembers,
        creator: formattedMembers.find((m: any) => m.is_leader) || formattedMembers[0],
      }
    })
  } catch (error: any) {
    console.error('Error fetching block:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/blocks
 * Create a new block
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

    // Generate a unique block code
    const generateCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let code = ''
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return code
    }

    let code = generateCode()
    let attempts = 0
    const maxAttempts = 10

    // Ensure code is unique
    while (attempts < maxAttempts) {
      const { data: existing } = await dbClient
        .from('student_blocks')
        .select('code')
        .eq('code', code)
        .maybeSingle()

      if (!existing) {
        break
      }
      code = generateCode()
      attempts++
    }

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { error: 'Failed to generate unique block code. Please try again.' },
        { status: 500 }
      )
    }

    // Create the block
    const { data: newBlock, error: blockError } = await dbClient
      .from('student_blocks')
      .insert({
        block_leader_id: user.id,
        max_capacity: 4,
        current_capacity: 0,
        code: code,
      })
      .select()
      .single()

    if (blockError) {
      return NextResponse.json(
        { error: `Failed to create block: ${blockError.message}` },
        { status: 500 }
      )
    }

    // Add creator as a member
    const { error: memberError } = await dbClient
      .from('block_members')
      .insert({
        block_id: newBlock.block_id,
        student_id: user.id,
        is_leader: true,
        joined_date: new Date().toISOString().split('T')[0],
      })

    if (memberError) {
      // Rollback: delete the block if member insertion fails
      await dbClient
        .from('student_blocks')
        .delete()
        .eq('block_id', newBlock.block_id)
      
      return NextResponse.json(
        { error: `Failed to add member: ${memberError.message}` },
        { status: 500 }
      )
    }

    // Update block capacity
    await dbClient
      .from('student_blocks')
      .update({ current_capacity: 1 })
      .eq('block_id', newBlock.block_id)

    // Update the creator's room assignment with the new block_id
    const { data: existingAssignment } = await dbClient
      .from('room_assignments')
      .select('assignment_id')
      .eq('student_id', user.id)
      .maybeSingle()

    if (existingAssignment) {
      // Update existing assignment with block_id
      await dbClient
        .from('room_assignments')
        .update({ block_id: newBlock.block_id })
        .eq('student_id', user.id)
    } else {
      // Create new assignment with block_id
      await dbClient
        .from('room_assignments')
        .insert({
          student_id: user.id,
          block_id: newBlock.block_id,
          status: 'Pending',
        })
    }

    return NextResponse.json({
      success: true,
      block: {
        id: String(newBlock.block_id),
        code: newBlock.code,
        maxMembers: newBlock.max_capacity,
      }
    })
  } catch (error: any) {
    console.error('Error creating block:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

