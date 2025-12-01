import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'

/**
 * POST /api/blocks/join
 * Join a block by code
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { code } = body

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Block code is required' },
        { status: 400 }
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

    // Find block by code
    const { data: block, error: blockError } = await supabase
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
    const { error: memberError } = await supabase
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

    // Update block capacity
    await supabase
      .from('student_blocks')
      .update({ current_capacity: block.current_capacity + 1 })
      .eq('block_id', block.block_id)

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

