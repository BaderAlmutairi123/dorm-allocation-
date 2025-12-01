import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

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

    // Check if user is in a block
    const { data: membership, error: membershipError } = await supabase
      .from('block_members')
      .select('block_id, is_leader')
      .eq('student_id', user.id)
      .maybeSingle()

    if (membershipError) {
      return NextResponse.json(
        { error: `Failed to check block membership: ${membershipError.message}` },
        { status: 500 }
      )
    }

    if (!membership) {
      return NextResponse.json({ block: null })
    }

    // Get block details
    const { data: block, error: blockError } = await supabase
      .from('student_blocks')
      .select('*')
      .eq('block_id', membership.block_id)
      .single()

    if (blockError) {
      return NextResponse.json(
        { error: `Failed to fetch block: ${blockError.message}` },
        { status: 500 }
      )
    }

    // Get all block members with their student info
    const { data: members, error: membersError } = await supabase
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
      return NextResponse.json(
        { error: `Failed to fetch members: ${membersError.message}` },
        { status: 500 }
      )
    }

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

    // Check if user is already in a block
    const { data: existingMembership } = await supabase
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
      const { data: existing } = await supabase
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
    const { data: newBlock, error: blockError } = await supabase
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
    const { error: memberError } = await supabase
      .from('block_members')
      .insert({
        block_id: newBlock.block_id,
        student_id: user.id,
        is_leader: true,
        joined_date: new Date().toISOString().split('T')[0],
      })

    if (memberError) {
      // Rollback: delete the block if member insertion fails
      await supabase
        .from('student_blocks')
        .delete()
        .eq('block_id', newBlock.block_id)
      
      return NextResponse.json(
        { error: `Failed to add member: ${memberError.message}` },
        { status: 500 }
      )
    }

    // Update block capacity
    await supabase
      .from('student_blocks')
      .update({ current_capacity: 1 })
      .eq('block_id', newBlock.block_id)

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

