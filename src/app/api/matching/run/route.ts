import { NextResponse } from 'next/server'
import { runMatchingAlgorithm } from '@/lib/matching/algorithm'

/**
 * POST /api/matching/run
 * 
 * Runs the matching algorithm to assign students to rooms.
 * This endpoint should be protected (admin only in production).
 */
export async function POST(request: Request) {
  try {
    // TODO: Add admin authentication check in production
    // const session = await getServerSession()
    // if (!session || !session.user.isAdmin) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const result = await runMatchingAlgorithm()

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Matching completed with errors',
          matches: result.matches,
          unmatched: result.unmatched,
          errors: result.errors,
        },
        { status: 200 } // Still return 200 as matching partially succeeded
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: `Successfully matched ${result.matches.length} students`,
        matches: result.matches,
        unmatched: result.unmatched,
        errors: result.errors,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error running matching algorithm:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run matching algorithm',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/matching/run
 * 
 * Get matching statistics without running the algorithm
 */
export async function GET() {
  try {
    // This could return stats about pending students, available rooms, etc.
    // For now, just return a message
    return NextResponse.json(
      {
        message: 'Use POST to run the matching algorithm',
      },
      { status: 200 }
    )
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Failed to get matching info',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

