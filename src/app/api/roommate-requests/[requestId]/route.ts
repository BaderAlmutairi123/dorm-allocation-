import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * PUT /api/roommate-requests/[requestId]
 * Accept or decline a roommate request
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params
    
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
      auth: { autoRefreshToken: false, persistSession: false },
    })
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status } = body

    if (!status || !['Accepted', 'Declined'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be "Accepted" or "Declined"' },
        { status: 400 }
      )
    }

    // Get the request
    const { data: existingRequest, error: fetchError } = await supabase
      .from('roommate_requests')
      .select('*')
      .eq('request_id', parseInt(requestId))
      .single()

    if (fetchError || !existingRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      )
    }

    // Verify user is the receiver
    if (existingRequest.receiver_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only respond to requests sent to you' },
        { status: 403 }
      )
    }

    // Check if already responded
    if (existingRequest.status !== 'Pending') {
      return NextResponse.json(
        { error: `This request has already been ${existingRequest.status.toLowerCase()}` },
        { status: 400 }
      )
    }

    // Update the request
    const { data: updatedRequest, error: updateError } = await supabase
      .from('roommate_requests')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('request_id', parseInt(requestId))
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update request: ${updateError.message}` },
        { status: 500 }
      )
    }

    // If accepted and there's a block code, add receiver to the block
    if (status === 'Accepted' && existingRequest.block_code) {
      // Find the block
      const { data: block } = await supabase
        .from('student_blocks')
        .select('block_id, current_capacity, max_capacity')
        .eq('code', existingRequest.block_code)
        .single()

      if (block && block.current_capacity < block.max_capacity) {
        // Check if user is already in a block
        const { data: existingMembership } = await supabase
          .from('block_members')
          .select('block_id')
          .eq('student_id', user.id)
          .maybeSingle()

        if (!existingMembership) {
          // Add to block
          await supabase
            .from('block_members')
            .insert({
              block_id: block.block_id,
              student_id: user.id,
              is_leader: false,
              joined_date: new Date().toISOString().split('T')[0],
            })

          // Update capacity
          await supabase
            .from('student_blocks')
            .update({ current_capacity: block.current_capacity + 1 })
            .eq('block_id', block.block_id)
        }
      }
    }

    return NextResponse.json({
      success: true,
      request: updatedRequest,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/roommate-requests/[requestId]
 * Cancel/delete a roommate request (only sender can delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params
    
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
      auth: { autoRefreshToken: false, persistSession: false },
    })
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the request
    const { data: existingRequest, error: fetchError } = await supabase
      .from('roommate_requests')
      .select('*')
      .eq('request_id', parseInt(requestId))
      .single()

    if (fetchError || !existingRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      )
    }

    // Verify user is the sender
    if (existingRequest.sender_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only cancel requests you sent' },
        { status: 403 }
      )
    }

    // Delete the request
    const { error: deleteError } = await supabase
      .from('roommate_requests')
      .delete()
      .eq('request_id', parseInt(requestId))

    if (deleteError) {
      return NextResponse.json(
        { error: `Failed to delete request: ${deleteError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Request cancelled',
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

