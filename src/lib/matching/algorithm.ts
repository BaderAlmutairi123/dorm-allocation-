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
  dorm_id?: number
  current_occupancy?: number
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
    .select('*')
    .eq('status', 'Pending')

  if (assignError || !assignments || assignments.length === 0) {
    return []
  }

  // Extract student IDs
  const studentIds = assignments
    .map(a => a.student_id)
    .filter((id): id is string => id !== null && id !== undefined)

  // Get student data
  const { data: students, error: studentsError } = await supabaseAdmin
    .from('students')
    .select('*')
    .in('student_id', studentIds)

  if (studentsError || !students || students.length === 0) {
    throw new Error(`Failed to fetch students: ${studentsError?.message || 'No students found'}`)
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
  return students.map(student => {
    const studentPref = preferences?.find(p => p.student_id === student.student_id) || null
    
    return {
      student_id: student.student_id,
      first_name: student.first_name,
      last_name: student.last_name,
      email: student.email,
      gender: student.gender,
      year_level: student.year_level,
      major: student.major,
      preferences: studentPref,
    }
  })
}

/**
 * Get all available rooms
 * Rooms are available if current_occupancy < max_capacity
 */
async function getAvailableRooms(): Promise<Room[]> {
  if (!supabaseAdmin) {
    throw new Error('Admin client not available')
  }

  // Get all rooms and filter by availability (current_occupancy < max_capacity)
  const { data: rooms, error } = await supabaseAdmin
    .from('rooms')
    .select('*')
    .order('dorm_id')
    .order('room_number')

  if (error) {
    throw new Error(`Failed to fetch rooms: ${error.message}`)
  }

  if (!rooms) {
    return []
  }

  // Filter rooms where current_occupancy < max_capacity and room has valid ID
  // Handle column name 'room.id' (with dot) - Supabase returns it as 'room.id' property
  
  // Log raw room data for debugging
  console.log('Raw rooms from database:', rooms.length, 'rooms')
  if (rooms.length > 0) {
    console.log('Sample room keys:', Object.keys(rooms[0]))
    console.log('Sample room:', JSON.stringify(rooms[0]))
  }
  
  return rooms
    .filter(room => {
      // Get ID - try both 'room.id' (with dot) and 'id' (without dot)
      const roomId = (room as any)['room.id'] || (room as any).id
      
      // Ensure room has valid ID
      if (!roomId || roomId === null || roomId === undefined) {
        console.warn('Room missing ID. Room keys:', Object.keys(room), 'Room:', room)
        return false
      }
      return (room.current_occupancy || 0) < (room.max_capacity || 0)
    })
    .map(room => {
      // Get ID - try both 'room.id' (with dot) and 'id' (without dot)
      const roomId = (room as any)['room.id'] || (room as any).id
      
      const mappedRoom = {
        id: String(roomId), // Convert to string for consistency
        building_name: room.dorm_id ? `Dorm ${room.dorm_id}` : 'Unknown', // Use dorm_id as building reference
        room_number: room.room_number,
        capacity: room.max_capacity,
        room_type: room.room_type?.toLowerCase() || 'double', // Normalize to lowercase
        floor: room.floor_number,
        is_available: true, // All returned rooms are available
        dorm_id: room.dorm_id, // Store dorm_id for reference
        current_occupancy: room.current_occupancy || 0,
      }
      
      // Log room type mapping for debugging
      console.log(`Room ${mappedRoom.room_number}: type="${room.room_type}" -> "${mappedRoom.room_type}", capacity=${mappedRoom.capacity}`)
      
      return mappedRoom
    })
    .filter(room => room.id && room.id !== 'undefined' && room.id !== 'null') // Additional safety check
}

/**
 * Get current room occupancy from confirmed assignments
 * Also includes current_occupancy from rooms table for accuracy
 */
async function getRoomOccupancy(): Promise<Map<string, number>> {
  if (!supabaseAdmin) {
    throw new Error('Admin client not available')
  }

  const occupancy = new Map<string, number>()

  // Get confirmed assignments
  const { data: assignments, error: assignError } = await supabaseAdmin
    .from('room_assignments')
    .select('room_id')
    .eq('status', 'Confirmed')
    .not('room_id', 'is', null)

  if (assignError) {
    console.warn(`Failed to fetch assignments for occupancy: ${assignError.message}`)
  } else if (assignments) {
    assignments.forEach(assignment => {
      if (assignment.room_id) {
        const roomId = String(assignment.room_id)
        occupancy.set(roomId, (occupancy.get(roomId) || 0) + 1)
      }
    })
  }

  // Also get current_occupancy from rooms table (more accurate)
  // Select 'room.id' column (with dot) as that's the actual column name
  const { data: rooms, error: roomsError } = await supabaseAdmin
    .from('rooms')
    .select('room.id, current_occupancy')

  if (!roomsError && rooms) {
    rooms.forEach((room: any) => {
      // Get ID - try both 'room.id' (with dot) and 'id' (without dot)
      const roomId = String(room['room.id'] || room.id)
      const roomOccupancy = room.current_occupancy || 0
      // Use the higher value (assignments count or room's current_occupancy)
      const existing = occupancy.get(roomId) || 0
      occupancy.set(roomId, Math.max(existing, roomOccupancy))
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
    // Try both 'blocks' and 'student_blocks' table names
    let blocks: any[] | null = null
    let blocksError: any = null

    const { data: blocks1, error: error1 } = await supabaseAdmin
      .from('student_blocks')
      .select('*')

    if (error1) {
      // Try 'blocks' table
      const { data: blocks2, error: error2 } = await supabaseAdmin
        .from('blocks')
        .select('*')

      if (error2) {
        blocksError = error2
      } else {
        blocks = blocks2
      }
    } else {
      blocks = blocks1
    }

    if (blocksError || !blocks || blocks.length === 0) {
      return new Map()
    }

    // Get block IDs - try both 'id' and 'block_id' field names
    const blockIds = blocks
      .map(b => b.block_id || b.id)
      .filter((id): id is number | string => id !== null && id !== undefined)

    // Get block members - your schema has no status column, just get all members
    const { data: members, error: membersError } = await supabaseAdmin
      .from('block_members')
      .select('*')
      .in('block_id', blockIds)
    
    // No status filtering needed - your schema doesn't have a status column
    const filteredMembers = members

    if (membersError) {
      console.warn('Block members table not available:', membersError.message)
      return new Map()
    }

    const blockMap = new Map<string, string[]>()
    if (filteredMembers) {
      filteredMembers.forEach(member => {
        const blockId = String(member.block_id || member.id)
        const studentId = member.student_id
        if (studentId) {
          const existing = blockMap.get(blockId) || []
          existing.push(studentId)
          blockMap.set(blockId, existing)
        }
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
      
      // Find a room that can accommodate the entire block - ONLY empty rooms (0 occupancy)
      const suitableRoom = rooms.find(room => {
        const occupancyFromMap = occupancy.get(room.id)
        const roomOccupancy = room.current_occupancy || 0
        const currentOccupancy = occupancyFromMap !== undefined ? occupancyFromMap : roomOccupancy
        // Only use completely empty rooms
        return currentOccupancy === 0 && room.capacity >= totalSize
      })

      if (suitableRoom && suitableRoom.id) {
        // Validate room has valid ID
        if (!suitableRoom.id || suitableRoom.id === undefined) {
          errors.push(`Suitable room for block ${blockId} has invalid ID`)
          blockStudents.forEach(student => {
            unmatched.push(student.student_id)
          })
          continue
        }

        // Room is empty (0 occupancy) - assign all block members to the same room
        blockStudents.forEach(student => {
          matches.push({
            student_id: student.student_id,
            room_id: suitableRoom.id,
            block_id: blockId,
          })
        })

        // Update occupancy for the entire block at once (room was empty, so new occupancy = totalSize)
        occupancy.set(suitableRoom.id, totalSize)

        // Room occupancy will be updated later in the batch update
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
      // Separate students who want Single rooms (no roommate needed)
      const singleRoomStudents: StudentWithPreferences[] = []
      const sharedRoomStudents: StudentWithPreferences[] = []
      
      genderStudents.forEach(student => {
        const pref = student.preferences?.preferred_room_type?.toLowerCase()
        if (pref === 'single') {
          singleRoomStudents.push(student)
        } else {
          sharedRoomStudents.push(student)
        }
      })
      
      const assigned = new Set<string>()
      
      // Process Single room students first - no roommate matching needed
      for (const student of singleRoomStudents) {
        console.log(`\nProcessing Single room student: ${student.student_id}`)
        console.log(`Student preference: ${student.preferences?.preferred_room_type}`)
        
        // Find available Single room - ONLY Single rooms with 0 occupancy
        const singleRooms = rooms.filter(room => {
          const occupancyFromMap = occupancy.get(room.id)
          const roomOccupancy = room.current_occupancy || 0
          // Prioritize occupancy map (from room_assignments) as it's the source of truth
          // Fall back to room.current_occupancy only if map has no data
          const currentOccupancy = occupancyFromMap !== undefined ? occupancyFromMap : roomOccupancy
          // Only allow rooms with 0 current occupancy (completely empty rooms)
          const isEmpty = currentOccupancy === 0
          const isSingle = room.room_type?.toLowerCase() === 'single'
          console.log(`  Room ${room.room_number} (id=${room.id}): type="${room.room_type}", isSingle=${isSingle}, capacity=${room.capacity}, occupancy=${currentOccupancy} (map=${occupancyFromMap}, room=${roomOccupancy}), isEmpty=${isEmpty}`)
          return isEmpty && isSingle
        })
        
        console.log(`Found ${singleRooms.length} available Single rooms`)
        
        if (singleRooms.length > 0) {
          const selectedRoom = singleRooms[0]
          
          if (!selectedRoom.id || selectedRoom.id === undefined) {
            errors.push(`Selected room has invalid ID for student ${student.student_id}`)
            unmatched.push(student.student_id)
            continue
          }
          
          // Create a block for this single student
          let newBlockId: string | null = null
          try {
            const blockCode = `BLK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
            
            const { data: newBlock, error: blockError } = await supabaseAdmin
              .from('student_blocks')
              .insert({ 
                code: blockCode,
                max_capacity: 1, // Single room = 1 person block
                current_capacity: 1,
              })
              .select('block_id')
              .single()
            
            if (!blockError && newBlock) {
              newBlockId = String(newBlock.block_id)
              
              // Add student to the block as leader
              await supabaseAdmin
                .from('block_members')
                .insert({
                  block_id: newBlock.block_id,
                  student_id: student.student_id,
                  is_leader: true,
                  joined_date: new Date().toISOString().split('T')[0],
                })
              
              console.log(`Created block ${blockCode} for single room student ${student.student_id}`)
            }
          } catch (blockErr: any) {
            console.warn('Failed to create block for single room student:', blockErr.message)
          }
          
          // Room is empty (0 occupancy), so new occupancy = 1
          const matchData = {
            student_id: student.student_id,
            room_id: selectedRoom.id,
            block_id: newBlockId,
          }
          matches.push(matchData)
          assigned.add(student.student_id)
          occupancy.set(selectedRoom.id, 1)
        } else {
          // No Single rooms available - mark as unmatched, don't assign to wrong room type
          unmatched.push(student.student_id)
          errors.push(`No Single rooms available for student ${student.student_id}`)
        }
      }
      
      // Now process shared room students with compatibility matching
      if (sharedRoomStudents.length > 0) {
        // Get existing students in partially filled rooms for compatibility matching
        const { data: existingAssignments } = await supabaseAdmin
          .from('room_assignments')
          .select('student_id, room_id, block_id')
          .eq('status', 'Confirmed')
          .not('room_id', 'is', null)

        // Get student data for existing assigned students
        const existingStudentIds = existingAssignments?.map(a => a.student_id).filter(Boolean) || []
        let existingStudentsData: StudentWithPreferences[] = []
        
        if (existingStudentIds.length > 0) {
          const { data: existingStudents } = await supabaseAdmin
            .from('students')
            .select('*')
            .in('student_id', existingStudentIds)
          
          const { data: existingPrefs } = await supabaseAdmin
            .from('student_preferences')
            .select('*')
            .in('student_id', existingStudentIds)
          
          existingStudentsData = (existingStudents || []).map(student => ({
            student_id: student.student_id,
            first_name: student.first_name,
            last_name: student.last_name,
            email: student.email,
            gender: student.gender,
            year_level: student.year_level,
            major: student.major,
            preferences: existingPrefs?.find(p => p.student_id === student.student_id) || null,
          }))
        }

        // Create a map of room_id -> existing students in that room
        const roomToStudents = new Map<string, { student: StudentWithPreferences, block_id: string | null }[]>()
        existingAssignments?.forEach(assignment => {
          if (assignment.room_id) {
            const roomId = String(assignment.room_id)
            const studentData = existingStudentsData.find(s => s.student_id === assignment.student_id)
            if (studentData) {
              const existing = roomToStudents.get(roomId) || []
              existing.push({ student: studentData, block_id: assignment.block_id })
              roomToStudents.set(roomId, existing)
            }
          }
        })
        
        // Calculate compatibility matrix for pending shared room students
        const compatibilityMatrix = new Map<string, Map<string, CompatibilityScore>>()
        
        for (let i = 0; i < sharedRoomStudents.length; i++) {
          for (let j = i + 1; j < sharedRoomStudents.length; j++) {
            const score = calculateCompatibility(sharedRoomStudents[i], sharedRoomStudents[j])
            if (!compatibilityMatrix.has(score.student1_id)) {
              compatibilityMatrix.set(score.student1_id, new Map())
            }
            compatibilityMatrix.get(score.student1_id)!.set(score.student2_id, score)
          }
        }
        
        // Sort students by preference (those with preferences first)
        const sortedStudents = [...sharedRoomStudents].sort((a, b) => {
          const aHasPrefs = a.preferences ? 1 : 0
          const bHasPrefs = b.preferences ? 1 : 0
          return bHasPrefs - aHasPrefs
        })
        
        // Try to match students
        for (const student of sortedStudents) {
          if (assigned.has(student.student_id)) continue
          
          const roomTypePreference = student.preferences?.preferred_room_type
          
          console.log(`\nProcessing shared room student: ${student.student_id}`)
          console.log(`Student preference: ${roomTypePreference}`)
          
          // STEP 1: Try to find a partially filled room with compatible existing roommate
          let bestPartialRoom: Room | null = null
          let bestPartialScore = 0
          let bestPartialBlockId: string | null = null
          
          // Find partially filled rooms that match room type preference
          const partiallyFilledRooms = rooms.filter(room => {
            const occupancyFromMap = occupancy.get(room.id)
            const roomOccupancy = room.current_occupancy || 0
            const currentOccupancy = occupancyFromMap !== undefined ? occupancyFromMap : roomOccupancy
            
            // Room must have space (not full) but also have at least 1 person
            const hasSpace = currentOccupancy > 0 && currentOccupancy < room.capacity
            if (!hasSpace) return false
            
            // Match room type preference
            if (roomTypePreference) {
              const roomTypeLower = room.room_type?.toLowerCase()
              const prefTypeLower = roomTypePreference.toLowerCase()
              return roomTypeLower === prefTypeLower
            }
            // No preference = only match Double or Suite (not Single)
            return room.room_type?.toLowerCase() !== 'single'
          })
          
          console.log(`Found ${partiallyFilledRooms.length} partially filled ${roomTypePreference || 'shared'} rooms`)
          
          // Check compatibility with existing students in partially filled rooms
          for (const room of partiallyFilledRooms) {
            const existingInRoom = roomToStudents.get(room.id) || []
            
            // Check gender compatibility - all students in room must be same gender
            const sameGender = existingInRoom.every(e => e.student.gender === student.gender)
            if (!sameGender) {
              console.log(`  Room ${room.room_number}: gender mismatch, skipping`)
              continue
            }
            
            // Calculate average compatibility with existing roommates
            let totalScore = 0
            for (const existing of existingInRoom) {
              const score = calculateCompatibility(student, existing.student)
              totalScore += score.score
            }
            const avgScore = existingInRoom.length > 0 ? totalScore / existingInRoom.length : 0
            
            console.log(`  Room ${room.room_number}: avg compatibility score = ${avgScore.toFixed(1)}`)
            
            // Only consider if compatibility is above threshold (60%)
            if (avgScore >= 60 && avgScore > bestPartialScore) {
              bestPartialScore = avgScore
              bestPartialRoom = room
              // Use the existing block_id from roommates
              bestPartialBlockId = existingInRoom[0]?.block_id || null
            }
          }
          
          // If we found a good partially filled room, assign there
          if (bestPartialRoom && bestPartialScore >= 60) {
            console.log(`Assigning to partially filled room ${bestPartialRoom.room_number} with score ${bestPartialScore.toFixed(1)}`)
            
            const currentOccupancy = occupancy.get(bestPartialRoom.id) || (bestPartialRoom.current_occupancy || 0)
            
            // Add student to the existing block if there is one
            if (bestPartialBlockId) {
              try {
                await supabaseAdmin
                  .from('block_members')
                  .insert({
                    block_id: parseInt(bestPartialBlockId),
                    student_id: student.student_id,
                    is_leader: false,
                    joined_date: new Date().toISOString().split('T')[0],
                  })
                
                // Update block capacity
                await supabaseAdmin
                  .from('student_blocks')
                  .update({ current_capacity: currentOccupancy + 1 })
                  .eq('block_id', parseInt(bestPartialBlockId))
                
                console.log(`Added student ${student.student_id} to existing block ${bestPartialBlockId}`)
              } catch (blockErr: any) {
                console.warn('Failed to add student to existing block:', blockErr.message)
              }
            }
            
            matches.push({
              student_id: student.student_id,
              room_id: bestPartialRoom.id,
              block_id: bestPartialBlockId,
              compatibility_score: bestPartialScore,
            })
            assigned.add(student.student_id)
            occupancy.set(bestPartialRoom.id, currentOccupancy + 1)
            continue
          }
          
          // STEP 2: Find best match among pending students
          let bestMatch: StudentWithPreferences | null = null
          let bestScore = 0
          
          for (const candidate of sortedStudents) {
            if (candidate.student_id === student.student_id || assigned.has(candidate.student_id)) {
              continue
            }
            
            const score = compatibilityMatrix.get(student.student_id)?.get(candidate.student_id)
            if (score && score.score > bestScore) {
              bestScore = score.score
              bestMatch = candidate
            }
          }
          
          // STEP 3: Find empty room that matches room type preference
          let suitableRooms = rooms.filter(room => {
            const occupancyFromMap = occupancy.get(room.id)
            const roomOccupancy = room.current_occupancy || 0
            const currentOccupancy = occupancyFromMap !== undefined ? occupancyFromMap : roomOccupancy
            const isEmpty = currentOccupancy === 0
            if (!isEmpty) return false
            
            // Strictly match room type
            if (roomTypePreference) {
              const roomTypeLower = room.room_type?.toLowerCase()
              const prefTypeLower = roomTypePreference.toLowerCase()
              const matches = roomTypeLower === prefTypeLower
              console.log(`  Room ${room.room_number} (id=${room.id}): type="${room.room_type}" (${roomTypeLower}) vs preference "${prefTypeLower}", capacity=${room.capacity}, occupancy=${currentOccupancy}, isEmpty=${isEmpty} -> match=${matches}`)
              return matches
            }
            // No preference = only match Double or Suite (not Single)
            return room.room_type?.toLowerCase() !== 'single'
          })
          
          console.log(`Found ${suitableRooms.length} empty ${roomTypePreference || 'shared'} rooms`)
          
          // If no suitable rooms of the correct type, mark as unmatched
          if (suitableRooms.length === 0) {
            unmatched.push(student.student_id)
            errors.push(`No ${roomTypePreference || 'shared'} rooms available for student ${student.student_id}`)
            continue
          }
          
          // Sort by capacity - prefer rooms with space for roommates
          suitableRooms.sort((a, b) => {
            const aOccupancy = occupancy.get(a.id) || (a.current_occupancy || 0)
            const bOccupancy = occupancy.get(b.id) || (b.current_occupancy || 0)
            const aRemaining = a.capacity - aOccupancy
            const bRemaining = b.capacity - bOccupancy
            
            if (bestMatch) {
              const aFitsBoth = aRemaining >= 2
              const bFitsBoth = bRemaining >= 2
              if (aFitsBoth !== bFitsBoth) return aFitsBoth ? -1 : 1
            }
            return aRemaining - bRemaining
          })
          
          if (suitableRooms.length > 0) {
            const selectedRoom = suitableRooms[0]
            
            if (!selectedRoom.id || selectedRoom.id === undefined) {
              errors.push(`Selected room has invalid ID for student ${student.student_id}`)
              unmatched.push(student.student_id)
              continue
            }
            
            // Room is empty (0 occupancy), so we have full capacity available
            const remaining = selectedRoom.capacity
            
            // Always create a block for room assignments
            let newBlockId: string | null = null
            const hasGoodMatch = bestMatch && remaining >= 2 && bestScore >= 60
            
            try {
              const blockCode = `BLK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
              
              const { data: newBlock, error: blockError } = await supabaseAdmin
                .from('student_blocks')
                .insert({ 
                  code: blockCode,
                  max_capacity: selectedRoom.capacity,
                  current_capacity: hasGoodMatch ? 2 : 1,
                })
                .select('block_id')
                .single()
              
              if (!blockError && newBlock) {
                newBlockId = String(newBlock.block_id)
                
                if (hasGoodMatch) {
                  // Add both students to the block
                  await supabaseAdmin
                    .from('block_members')
                    .insert([
                      { 
                        block_id: newBlock.block_id, 
                        student_id: student.student_id,
                        is_leader: true,
                        joined_date: new Date().toISOString().split('T')[0],
                      },
                      { 
                        block_id: newBlock.block_id, 
                        student_id: bestMatch.student_id,
                        is_leader: false,
                        joined_date: new Date().toISOString().split('T')[0],
                      }
                    ])
                  console.log(`Created block ${blockCode} for matched students ${student.student_id} and ${bestMatch.student_id}`)
                } else {
                  // Add only this student to the block
                  await supabaseAdmin
                    .from('block_members')
                    .insert({
                      block_id: newBlock.block_id,
                      student_id: student.student_id,
                      is_leader: true,
                      joined_date: new Date().toISOString().split('T')[0],
                    })
                  console.log(`Created block ${blockCode} for solo student ${student.student_id}`)
                }
              }
            } catch (blockErr: any) {
              console.warn('Failed to create block for students:', blockErr.message)
            }
            
            // Assign student - room is empty so new occupancy starts at 1
            const matchData = {
              student_id: student.student_id,
              room_id: selectedRoom.id,
              block_id: newBlockId,
              compatibility_score: hasGoodMatch ? bestScore : undefined,
              matched_with: hasGoodMatch ? [bestMatch!.student_id] : undefined,
            }
            matches.push(matchData)
            assigned.add(student.student_id)
            occupancy.set(selectedRoom.id, 1)
            
            // If we have a good match and room has space, assign them together
            if (hasGoodMatch) {
              matches.push({
                student_id: bestMatch!.student_id,
                room_id: selectedRoom.id,
                block_id: newBlockId,
                compatibility_score: bestScore,
                matched_with: [student.student_id],
              })
              assigned.add(bestMatch!.student_id)
              occupancy.set(selectedRoom.id, 2)  // Two students in empty room = 2
            }
          } else {
            unmatched.push(student.student_id)
          }
        }
      }
    }

    // Update room assignments in database
    // Filter out matches with invalid room_id before processing
    const validMatches = matches.filter(m => {
      if (!m.room_id || m.room_id === undefined || m.room_id === null) {
        errors.push(`Invalid room_id for student ${m.student_id}: room_id is undefined`)
        unmatched.push(m.student_id)
        return false
      }
      return true
    })

    for (const match of validMatches) {
      const updateData: any = {
        room_id: match.room_id,
        status: 'Confirmed',
        assignment_date: new Date().toISOString().split('T')[0], // Set assignment date to today
      }
      
      if (match.block_id !== null && match.block_id !== undefined) {
        updateData.block_id = match.block_id
      }

      // Convert room_id to integer if it's a string (room.id is stored as integer in DB)
      let roomIdInt: number
      if (typeof updateData.room_id === 'string') {
        roomIdInt = parseInt(updateData.room_id, 10)
        if (isNaN(roomIdInt)) {
          errors.push(`Invalid room_id for student ${match.student_id}: ${updateData.room_id}`)
          unmatched.push(match.student_id)
          continue
        }
      } else if (typeof updateData.room_id === 'number') {
        roomIdInt = updateData.room_id
      } else {
        errors.push(`Invalid room_id type for student ${match.student_id}: ${typeof updateData.room_id}`)
        unmatched.push(match.student_id)
        continue
      }

      const updateDataFinal: any = {
        room_id: roomIdInt,
        status: 'Confirmed',
        assignment_date: new Date().toISOString().split('T')[0],
      }
      
      if (match.block_id !== null && match.block_id !== undefined) {
        // Convert block_id to integer if it's a string
        if (typeof match.block_id === 'string') {
          const blockIdInt = parseInt(match.block_id, 10)
          if (!isNaN(blockIdInt)) {
            updateDataFinal.block_id = blockIdInt
          }
        } else {
          updateDataFinal.block_id = match.block_id
        }
      }

      const { data: updateResult, error: updateError } = await supabaseAdmin
        .from('room_assignments')
        .update(updateDataFinal)
        .eq('student_id', match.student_id)
        .eq('status', 'Pending')
        .select()

      if (updateError) {
        errors.push(`Failed to assign room for student ${match.student_id}: ${updateError.message}`)
      }
    }

    // Update room current_occupancy (your schema uses current_occupancy instead of is_available)
    // The occupancy map was already updated during matching, so we use it directly
    const assignedRoomIds = [...new Set(validMatches.map(m => String(m.room_id)))]
    for (const roomId of assignedRoomIds) {
      // Find room by 'room.id' (column name has a dot)
      const room = rooms.find(r => {
        const rId = (r as any)['room.id'] || r.id
        return String(rId) === roomId || rId === parseInt(roomId)
      })
      
      if (room) {
        // The occupancy map was already updated during matching to reflect the new occupancy
        // Just use it directly - don't add newAssignmentCounts again (that was causing double-counting)
        const newOccupancy = occupancy.get(roomId) ?? (room.current_occupancy || 0)
        
        console.log(`Updating room ${room.room_number} (id=${roomId}): setting occupancy to ${newOccupancy}`)
        
        // Update current_occupancy in rooms table
        // Column name is 'room.id' (with dot) - match by dorm_id and room_number instead
        const { error } = await supabaseAdmin
          .from('rooms')
          .update({ current_occupancy: newOccupancy })
          .eq('dorm_id', room.dorm_id)
          .eq('room_number', room.room_number)

        if (error) {
          errors.push(`Failed to update room ${roomId} occupancy: ${error.message}`)
        }
      } else {
        errors.push(`Room not found for ID: ${roomId}`)
      }
    }

    return {
      success: errors.length === 0,
      matches: validMatches,
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

