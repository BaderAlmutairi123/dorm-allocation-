/**
 * Dorm Allocation Matching Algorithm
 * 
 * This algorithm matches students to rooms based on:
 * - Compatibility scores (preferences matching)
 * - Room type preferences
 * - Gender compatibility
 * - Room capacity
 * - Block assignments (groups of students)
 */

import { supabaseAdmin } from '@/lib/supabase/server'

export interface StudentWithPreferences {
  student_id: string
  first_name: string
  last_name: string
  email: string
  gender: string
  year_level: string
  major: string | null
  preferences: {
    preferred_room_type: string | null
    bedtime: string | null
    noise_level: number | null
    cleanliness_level: number | null
    guest_policy_preference: number | null
  } | null
}

export interface Room {
  id: string
  building_name: string
  room_number: string
  capacity: number
  room_type: string
  floor: number | null
  is_available: boolean
}

export interface CompatibilityScore {
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

export interface MatchResult {
  student_id: string
  room_id: string
  block_id: string | null
  compatibility_score?: number
  matched_with?: string[]
}

/**
 * Calculate compatibility score between two students
 */
export function calculateCompatibility(
  student1: StudentWithPreferences,
  student2: StudentWithPreferences
): CompatibilityScore {
  const pref1 = student1.preferences
  const pref2 = student2.preferences

  // If either student has no preferences, return neutral score
  if (!pref1 || !pref2) {
    return {
      student1_id: student1.student_id,
      student2_id: student2.student_id,
      score: 50,
      breakdown: {
        bedtime: 50,
        noiseLevel: 50,
        cleanliness: 50,
        guestPolicy: 50,
      },
    }
  }

  let totalScore = 0
  const breakdown: CompatibilityScore['breakdown'] = {
    bedtime: 0,
    noiseLevel: 0,
    cleanliness: 0,
    guestPolicy: 0,
  }

  // Bedtime compatibility (weight: 25%)
  if (pref1.bedtime && pref2.bedtime) {
    if (pref1.bedtime === pref2.bedtime) {
      breakdown.bedtime = 100
    } else {
      // Early Bird + Night Owl = low compatibility
      breakdown.bedtime = 30
    }
  } else {
    breakdown.bedtime = 50 // Neutral if missing
  }
  totalScore += breakdown.bedtime * 0.25

  // Noise level compatibility (weight: 25%)
  if (pref1.noise_level !== null && pref2.noise_level !== null) {
    const diff = Math.abs(pref1.noise_level - pref2.noise_level)
    // Closer values = higher compatibility
    breakdown.noiseLevel = Math.max(0, 100 - diff * 20)
  } else {
    breakdown.noiseLevel = 50
  }
  totalScore += breakdown.noiseLevel * 0.25

  // Cleanliness compatibility (weight: 25%)
  if (pref1.cleanliness_level !== null && pref2.cleanliness_level !== null) {
    const diff = Math.abs(pref1.cleanliness_level - pref2.cleanliness_level)
    // Closer values = higher compatibility
    breakdown.cleanliness = Math.max(0, 100 - diff * 20)
  } else {
    breakdown.cleanliness = 50
  }
  totalScore += breakdown.cleanliness * 0.25

  // Guest policy compatibility (weight: 25%)
  if (pref1.guest_policy_preference !== null && pref2.guest_policy_preference !== null) {
    const diff = Math.abs(pref1.guest_policy_preference - pref2.guest_policy_preference)
    // Closer values = higher compatibility
    breakdown.guestPolicy = Math.max(0, 100 - diff * 25)
  } else {
    breakdown.guestPolicy = 50
  }
  totalScore += breakdown.guestPolicy * 0.25

  return {
    student1_id: student1.student_id,
    student2_id: student2.student_id,
    score: Math.round(totalScore),
    breakdown,
  }
}

/**
 * Get all students with pending assignments
 */
async function getPendingStudents(): Promise<StudentWithPreferences[]> {
  if (!supabaseAdmin) {
    throw new Error('Admin client not available')
  }

  // Get all students with pending room assignments
  const { data: assignments, error: assignError } = await supabaseAdmin
    .from('room_assignments')
    .select('student_id')
    .eq('status', 'Pending')

  if (assignError) {
    throw new Error(`Failed to fetch pending assignments: ${assignError.message}`)
  }

  if (!assignments || assignments.length === 0) {
    return []
  }

  const studentIds = assignments
    .map(a => a.student_id)
    .filter((id): id is string => id !== null && id !== undefined)

  // Get student data
  // The schema uses 'student_id' as the primary key (matching application route)
  const { data: students, error: studentsError } = await supabaseAdmin
    .from('students')
    .select('*')
    .in('student_id', studentIds)

  // If that fails, try with 'id' (some schemas might use id)
  let studentsData = students
  if (studentsError || !students || students.length === 0) {
    const { data: altStudents, error: altError } = await supabaseAdmin
      .from('students')
      .select('*')
      .in('id', studentIds)

    if (altError) {
      throw new Error(`Failed to fetch students: ${studentsError?.message || altError.message}`)
    }

    if (altStudents && altStudents.length > 0) {
      // Map id to student_id for consistency
      studentsData = altStudents.map(s => ({
        ...s,
        student_id: s.student_id || s.id,
      }))
    }
  }

  if (!studentsData || studentsData.length === 0) {
    return []
  }

  // Get preferences for all students
  const { data: preferences, error: prefError } = await supabaseAdmin
    .from('student_preferences')
    .select('*')
    .in('student_id', studentIds)

  if (prefError) {
    console.warn(`Failed to fetch preferences: ${prefError.message}`)
  }

  // Combine students with their preferences
  return studentsData.map(student => {
    const studentId = student.student_id || student.id
    return {
      student_id: studentId,
      first_name: student.first_name,
      last_name: student.last_name,
      email: student.email,
      gender: student.gender,
      year_level: student.year_level,
      major: student.major,
      preferences: preferences?.find(p => p.student_id === studentId) || null,
    }
  })
}

/**
 * Get all available rooms
 */
async function getAvailableRooms(): Promise<Room[]> {
  if (!supabaseAdmin) {
    throw new Error('Admin client not available')
  }

  const { data: rooms, error } = await supabaseAdmin
    .from('rooms')
    .select('*')
    .eq('is_available', true)
    .order('building_name')
    .order('room_number')

  if (error) {
    throw new Error(`Failed to fetch rooms: ${error.message}`)
  }

  return rooms || []
}

/**
 * Get current room occupancy
 */
async function getRoomOccupancy(): Promise<Map<string, number>> {
  if (!supabaseAdmin) {
    throw new Error('Admin client not available')
  }

  const { data: assignments, error } = await supabaseAdmin
    .from('room_assignments')
    .select('room_id')
    .eq('status', 'Assigned')
    .not('room_id', 'is', null)

  if (error) {
    throw new Error(`Failed to fetch room occupancy: ${error.message}`)
  }

  const occupancy = new Map<string, number>()
  if (assignments) {
    assignments.forEach(assignment => {
      if (assignment.room_id) {
        occupancy.set(assignment.room_id, (occupancy.get(assignment.room_id) || 0) + 1)
      }
    })
  }

  return occupancy
}

/**
 * Get blocks and their members
 * Returns empty map if blocks table doesn't exist or has errors
 */
async function getBlocks(): Promise<Map<string, string[]>> {
  if (!supabaseAdmin) {
    return new Map() // Return empty map instead of throwing
  }

  try {
    // Get all blocks
    const { data: blocks, error: blocksError } = await supabaseAdmin
      .from('blocks')
      .select('id')

    if (blocksError) {
      // Table might not exist, return empty map
      console.warn('Blocks table not available:', blocksError.message)
      return new Map()
    }

    if (!blocks || blocks.length === 0) {
      return new Map()
    }

    const blockIds = blocks.map(b => b.id)

    // Get block members
    const { data: members, error: membersError } = await supabaseAdmin
      .from('block_members')
      .select('block_id, student_id')
      .in('block_id', blockIds)
      .eq('status', 'accepted')

    if (membersError) {
      console.warn('Block members table not available:', membersError.message)
      return new Map()
    }

    const blockMap = new Map<string, string[]>()
    if (members) {
      members.forEach(member => {
        const existing = blockMap.get(member.block_id) || []
        existing.push(member.student_id)
        blockMap.set(member.block_id, existing)
      })
    }

    return blockMap
  } catch (error: any) {
    console.warn('Error fetching blocks:', error.message)
    return new Map() // Return empty map on any error
  }
}

/**
 * Main matching algorithm
 */
export async function runMatchingAlgorithm(): Promise<{
  success: boolean
  matches: MatchResult[]
  unmatched: string[]
  errors: string[]
}> {
  const errors: string[] = []
  const matches: MatchResult[] = []
  const unmatched: string[] = []

  try {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available. Please set SUPABASE_SERVICE_ROLE_KEY.')
    }

    // Get all data needed for matching
    const [students, rooms, occupancy, blocks] = await Promise.all([
      getPendingStudents(),
      getAvailableRooms(),
      getRoomOccupancy(),
      getBlocks(),
    ])

    if (students.length === 0) {
      return {
        success: true,
        matches: [],
        unmatched: [],
        errors: ['No pending students to match'],
      }
    }

    if (rooms.length === 0) {
      return {
        success: false,
        matches: [],
        unmatched: students.map(s => s.student_id),
        errors: ['No available rooms'],
      }
    }

    // Create a map of student_id to block_id
    const studentToBlock = new Map<string, string>()
    blocks.forEach((memberIds, blockId) => {
      memberIds.forEach(studentId => {
        studentToBlock.set(studentId, blockId)
      })
    })

    // Group students by block
    const blockGroups = new Map<string, StudentWithPreferences[]>()
    const individualStudents: StudentWithPreferences[] = []

    students.forEach(student => {
      const blockId = studentToBlock.get(student.student_id)
      if (blockId) {
        const group = blockGroups.get(blockId) || []
        group.push(student)
        blockGroups.set(blockId, group)
      } else {
        individualStudents.push(student)
      }
    })

    // Process blocks first (they need to be together)
    for (const [blockId, blockStudents] of blockGroups.entries()) {
      const totalSize = blockStudents.length
      
      // Find a room that can accommodate the entire block
      const suitableRoom = rooms.find(room => {
        const currentOccupancy = occupancy.get(room.id) || 0
        return room.capacity >= currentOccupancy + totalSize && room.is_available
      })

      if (suitableRoom) {
        // Assign all block members to the same room
        blockStudents.forEach(student => {
          matches.push({
            student_id: student.student_id,
            room_id: suitableRoom.id,
            block_id: blockId,
          })
          occupancy.set(suitableRoom.id, (occupancy.get(suitableRoom.id) || 0) + 1)
        })

        // Mark room as unavailable if full
        if ((occupancy.get(suitableRoom.id) || 0) >= suitableRoom.capacity) {
          suitableRoom.is_available = false
        }
      } else {
        // Couldn't find a room for the block
        blockStudents.forEach(student => {
          unmatched.push(student.student_id)
        })
        errors.push(`Could not find room for block ${blockId} (${totalSize} students)`)
      }
    }

    // Process individual students
    // Group by gender and room type preference
    const studentsByGender = new Map<string, StudentWithPreferences[]>()
    individualStudents.forEach(student => {
      const gender = student.gender || 'Other'
      const group = studentsByGender.get(gender) || []
      group.push(student)
      studentsByGender.set(gender, group)
    })

    // Match individual students
    for (const [gender, genderStudents] of studentsByGender.entries()) {
      // Calculate compatibility matrix
      const compatibilityMatrix = new Map<string, Map<string, CompatibilityScore>>()
      
      for (let i = 0; i < genderStudents.length; i++) {
        for (let j = i + 1; j < genderStudents.length; j++) {
          const score = calculateCompatibility(genderStudents[i], genderStudents[j])
          if (!compatibilityMatrix.has(score.student1_id)) {
            compatibilityMatrix.set(score.student1_id, new Map())
          }
          compatibilityMatrix.get(score.student1_id)!.set(score.student2_id, score)
        }
      }

      // Sort students by preference (those with preferences first)
      const sortedStudents = [...genderStudents].sort((a, b) => {
        const aHasPrefs = a.preferences ? 1 : 0
        const bHasPrefs = b.preferences ? 1 : 0
        return bHasPrefs - aHasPrefs
      })

      const assigned = new Set<string>()

      // Try to match students in pairs/groups
      for (const student of sortedStudents) {
        if (assigned.has(student.student_id)) continue

        // Find best match
        let bestMatch: StudentWithPreferences | null = null
        let bestScore = 0

        for (const candidate of sortedStudents) {
          if (
            candidate.student_id === student.student_id ||
            assigned.has(candidate.student_id)
          ) {
            continue
          }

          const score = compatibilityMatrix.get(student.student_id)?.get(candidate.student_id)
          if (score && score.score > bestScore) {
            bestScore = score.score
            bestMatch = candidate
          }
        }

        // Find suitable room
        const roomTypePreference = student.preferences?.preferred_room_type
        let suitableRooms = rooms.filter(room => {
          const currentOccupancy = occupancy.get(room.id) || 0
          const hasSpace = room.capacity > currentOccupancy && room.is_available
          
          // If student has room type preference, try to match it
          if (roomTypePreference && hasSpace) {
            const roomTypeMap: Record<string, string> = {
              'Single': 'single',
              'Double': 'double',
              'Suite': 'suite',
            }
            return room.room_type === roomTypeMap[roomTypePreference] || !roomTypePreference
          }
          
          return hasSpace
        })

        // Sort by capacity (prefer rooms that fit exactly)
        suitableRooms.sort((a, b) => {
          const aOccupancy = occupancy.get(a.id) || 0
          const bOccupancy = occupancy.get(b.id) || 0
          const aRemaining = a.capacity - aOccupancy
          const bRemaining = b.capacity - bOccupancy
          
          // If we have a match, prefer rooms that fit both
          if (bestMatch) {
            const aFitsBoth = aRemaining >= 2
            const bFitsBoth = bRemaining >= 2
            if (aFitsBoth !== bFitsBoth) return aFitsBoth ? -1 : 1
          }
          
          return aRemaining - bRemaining
        })

        if (suitableRooms.length > 0) {
          const selectedRoom = suitableRooms[0]
          const currentOccupancy = occupancy.get(selectedRoom.id) || 0
          const remaining = selectedRoom.capacity - currentOccupancy

          // Assign student
          matches.push({
            student_id: student.student_id,
            room_id: selectedRoom.id,
            block_id: null,
            compatibility_score: bestMatch ? bestScore : undefined,
            matched_with: bestMatch ? [bestMatch.student_id] : undefined,
          })
          assigned.add(student.student_id)
          occupancy.set(selectedRoom.id, currentOccupancy + 1)

          // If we have a good match and room has space, assign them together
          if (bestMatch && remaining >= 2 && bestScore >= 60) {
            matches.push({
              student_id: bestMatch.student_id,
              room_id: selectedRoom.id,
              block_id: null,
              compatibility_score: bestScore,
              matched_with: [student.student_id],
            })
            assigned.add(bestMatch.student_id)
            occupancy.set(selectedRoom.id, currentOccupancy + 2)
          }
        } else {
          unmatched.push(student.student_id)
        }
      }
    }

    // Update room assignments in database
    for (const match of matches) {
      const { error } = await supabaseAdmin
        .from('room_assignments')
        .update({
          room_id: match.room_id,
          block_id: match.block_id,
          status: 'Assigned',
        })
        .eq('student_id', match.student_id)
        .eq('status', 'Pending')

      if (error) {
        errors.push(`Failed to assign room for student ${match.student_id}: ${error.message}`)
      }
    }

    // Update room availability
    const assignedRoomIds = [...new Set(matches.map(m => m.room_id))]
    for (const roomId of assignedRoomIds) {
      const room = rooms.find(r => r.id === roomId)
      if (room) {
        const currentOccupancy = occupancy.get(roomId) || 0
        if (currentOccupancy >= room.capacity) {
          const { error } = await supabaseAdmin
            .from('rooms')
            .update({ is_available: false })
            .eq('id', roomId)

          if (error) {
            errors.push(`Failed to update room ${roomId} availability: ${error.message}`)
          }
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
    errors.push(error.message || 'Unknown error occurred')
    return {
      success: false,
      matches,
      unmatched,
      errors,
    }
  }
}

