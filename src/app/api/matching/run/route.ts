import { NextResponse } from 'next/server'
import { runMatchingAlgorithm } from '@/lib/matching/algorithm'

export async function POST() {
  try {
    // TODO: Add admin authentication check
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
        { status: 200 }
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

