import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * GET /api/roommate-requests
 * Get all roommate requests for the current user (sent and received)
 */
export async function GET(request: NextRequest) {
  try {
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

    // Get requests sent by user
    const { data: sentRequests, error: sentError } = await supabase
      .from('roommate_requests')
      .select(`
        *,
        receiver:receiver_id (
          student_id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('sender_id', user.id)
      .order('created_at', { ascending: false })

    // Get requests received by user
    const { data: receivedRequests, error: receivedError } = await supabase
      .from('roommate_requests')
      .select(`
        *,
        sender:sender_id (
          student_id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('receiver_id', user.id)
      .order('created_at', { ascending: false })

    if (sentError || receivedError) {
      return NextResponse.json(
        { error: 'Failed to fetch requests' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      sent: sentRequests || [],
      received: receivedRequests || [],
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/roommate-requests
 * Send a roommate request
 */
export async function POST(request: NextRequest) {
  try {
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
    const { receiver_id, block_code, message } = body

    if (!receiver_id) {
      return NextResponse.json(
        { error: 'Receiver ID is required' },
        { status: 400 }
      )
    }

    if (receiver_id === user.id) {
      return NextResponse.json(
        { error: 'Cannot send a request to yourself' },
        { status: 400 }
      )
    }

    // Check if request already exists
    const { data: existingRequest } = await supabase
      .from('roommate_requests')
      .select('request_id, status')
      .eq('sender_id', user.id)
      .eq('receiver_id', receiver_id)
      .maybeSingle()

    if (existingRequest) {
      return NextResponse.json(
        { error: `You already sent a request to this student (status: ${existingRequest.status})` },
        { status: 400 }
      )
    }

    // Create the request
    const { data: newRequest, error: createError } = await supabase
      .from('roommate_requests')
      .insert({
        sender_id: user.id,
        receiver_id,
        block_code: block_code || null,
        message: message || null,
        status: 'Pending',
      })
      .select()
      .single()

    if (createError) {
      return NextResponse.json(
        { error: `Failed to create request: ${createError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      request: newRequest,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

