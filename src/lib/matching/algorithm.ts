import { supabaseAdmin } from '@/lib/supabase/server'

export interface Student {
  student_id: string
  first_name: string
  last_name: string
  email: string
  gender?: string
  year_level?: number | string
  major?: string
  preferences?: {
    preferred_room_type?: string
    bedtime?: string
    noise_level?: number
    cleanliness_level?: number
    guest_policy_preference?: number
  }
}

export interface CompatibilityResult {
  student1_id: string
  student2_id: string
  score: number
  breakdown: {
    bedtime: number
    noiseLevel: number
    cleanliness: number
    guestPolicy: number
  }
}

export function calculateCompatibility(student1: Student, student2: Student): CompatibilityResult {
  const pref1 = student1.preferences || {}
  const pref2 = student2.preferences || {}

  // Bedtime compatibility (25% weight)
  let bedtimeScore = 50 // Default neutral score
  if (pref1.bedtime && pref2.bedtime) {
    if (pref1.bedtime === pref2.bedtime) {
      bedtimeScore = 100
    } else {
      // Partial match (e.g., early vs. flexible)
      bedtimeScore = 50
    }
  }

  // Noise level compatibility (25% weight)
  let noiseScore = 50
  if (pref1.noise_level !== undefined && pref2.noise_level !== undefined) {
    const diff = Math.abs((pref1.noise_level || 0) - (pref2.noise_level || 0))
    // Closer values = higher score (scale 1-5, so max diff is 4)
    noiseScore = Math.max(0, 100 - (diff * 25))
  }

  // Cleanliness compatibility (25% weight)
  let cleanlinessScore = 50
  if (pref1.cleanliness_level !== undefined && pref2.cleanliness_level !== undefined) {
    const diff = Math.abs((pref1.cleanliness_level || 0) - (pref2.cleanliness_level || 0))
    cleanlinessScore = Math.max(0, 100 - (diff * 25))
  }

  // Guest policy compatibility (25% weight)
  let guestPolicyScore = 50
  if (pref1.guest_policy_preference !== undefined && pref2.guest_policy_preference !== undefined) {
    const diff = Math.abs((pref1.guest_policy_preference || 0) - (pref2.guest_policy_preference || 0))
    guestPolicyScore = Math.max(0, 100 - (diff * 25))
  }

  // Calculate weighted average
  const overallScore = Math.round(
    (bedtimeScore * 0.25) +
    (noiseScore * 0.25) +
    (cleanlinessScore * 0.25) +
    (guestPolicyScore * 0.25)
  )

  return {
    student1_id: student1.student_id,
    student2_id: student2.student_id,
    score: overallScore,
    breakdown: {
      bedtime: bedtimeScore,
      noiseLevel: noiseScore,
      cleanliness: cleanlinessScore,
      guestPolicy: guestPolicyScore,
    },
  }
}

export interface MatchingResult {
  success: boolean
  matches: Array<{
    student_id: string
    room_id: number
    block_id?: number
  }>
  unmatched: string[]
  errors: string[]
}

export async function runMatchingAlgorithm(): Promise<MatchingResult> {
  if (!supabaseAdmin) {
    return {
      success: false,
      matches: [],
      unmatched: [],
      errors: ['Admin client not available'],
    }
  }

  const matches: Array<{ student_id: string; room_id: number; block_id?: number }> = []
  const unmatched: string[] = []
  const errors: string[] = []

  try {
    // Get all pending students
    const { data: pendingAssignments, error: pendingError } = await supabaseAdmin
      .from('room_assignments')
      .select('student_id, block_id')
      .eq('status', 'Pending')

    if (pendingError) {
      errors.push(`Failed to fetch pending assignments: ${pendingError.message}`)
      return { success: false, matches, unmatched, errors }
    }

    if (!pendingAssignments || pendingAssignments.length === 0) {
      return {
        success: true,
        matches: [],
        unmatched: [],
        errors: ['No pending students to match'],
      }
    }

    // Get all rooms and filter available ones
    const { data: allRooms, error: roomsError } = await supabaseAdmin
      .from('rooms')
      .select('room_id, max_capacity, current_occupancy, dorm_id')

    const availableRooms = allRooms?.filter(
      (room: any) => (room.current_occupancy || 0) < (room.max_capacity || 1)
    ) || []

    if (roomsError) {
      errors.push(`Failed to fetch available rooms: ${roomsError.message}`)
      return { success: false, matches, unmatched, errors }
    }

    if (!availableRooms || availableRooms.length === 0) {
      return {
        success: true,
        matches: [],
        unmatched: pendingAssignments.map(a => a.student_id),
        errors: ['No available rooms'],
      }
    }

    // Simple matching: assign students to available rooms
    // In a real implementation, you'd use the compatibility algorithm
    let roomIndex = 0
    for (const assignment of pendingAssignments) {
      if (roomIndex >= availableRooms.length) {
        unmatched.push(assignment.student_id)
        continue
      }

      const room = availableRooms[roomIndex]
      const currentOccupancy = room.current_occupancy || 0
      const maxCapacity = room.max_capacity || 1

      if (currentOccupancy < maxCapacity) {
        // Update room assignment
        const { error: updateError } = await supabaseAdmin
          .from('room_assignments')
          .update({
            room_id: room.room_id,
            status: 'Confirmed',
            assignment_date: new Date().toISOString(),
          })
          .eq('student_id', assignment.student_id)

        if (updateError) {
          errors.push(`Failed to assign student ${assignment.student_id}: ${updateError.message}`)
          unmatched.push(assignment.student_id)
        } else {
          // Update room occupancy
          await supabaseAdmin
            .from('rooms')
            .update({ current_occupancy: currentOccupancy + 1 })
            .eq('room_id', room.room_id)

          matches.push({
            student_id: assignment.student_id,
            room_id: room.room_id,
            block_id: assignment.block_id || undefined,
          })

          // Move to next room if this one is full
          if (currentOccupancy + 1 >= maxCapacity) {
            roomIndex++
          }
        }
      } else {
        roomIndex++
        if (roomIndex < availableRooms.length) {
          // Try again with next room
          const nextRoom = availableRooms[roomIndex]
          const { error: updateError } = await supabaseAdmin
            .from('room_assignments')
            .update({
              room_id: nextRoom.room_id,
              status: 'Confirmed',
              assignment_date: new Date().toISOString(),
            })
            .eq('student_id', assignment.student_id)

          if (!updateError) {
            await supabaseAdmin
              .from('rooms')
              .update({ current_occupancy: (nextRoom.current_occupancy || 0) + 1 })
              .eq('room_id', nextRoom.room_id)

            matches.push({
              student_id: assignment.student_id,
              room_id: nextRoom.room_id,
              block_id: assignment.block_id || undefined,
            })
          } else {
            unmatched.push(assignment.student_id)
          }
        } else {
          unmatched.push(assignment.student_id)
        }
      }
    }

    return {
      success: errors.length === 0,
      matches,
      unmatched,
      errors,
    }
  } catch (error: any) {
    errors.push(`Unexpected error: ${error.message}`)
    return {
      success: false,
      matches,
      unmatched,
      errors,
    }
  }
}

