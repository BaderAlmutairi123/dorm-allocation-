// Database types for type-safe Supabase queries
// These will match your Supabase database schema

export interface Student {
  id: string
  email: string
  first_name: string
  last_name: string
  year_level: number
  gpa?: number
  phone?: string
  created_at: string
  updated_at: string
}

export interface Preference {
  id: string
  student_id: string
  sleep_schedule: 'early' | 'late' | 'flexible'
  study_habits: 'quiet' | 'moderate' | 'social'
  cleanliness: 'very_clean' | 'clean' | 'moderate' | 'relaxed'
  guest_policy: 'never' | 'rarely' | 'sometimes' | 'often'
  interests: string[]
  created_at: string
  updated_at: string
}

export interface Block {
  id: string
  name: string
  leader_id: string
  max_size: number
  current_size: number
  dorm_preferences?: string[]
  created_at: string
  updated_at: string
}

export interface BlockMember {
  id: string
  block_id: string
  student_id: string
  status: 'pending' | 'accepted' | 'declined'
  joined_at: string
}

export interface Room {
  id: string
  building_name: string
  room_number: string
  capacity: number
  room_type: 'single' | 'double' | 'triple' | 'suite'
  floor: number
  is_available: boolean
  created_at: string
  updated_at: string
}

export interface Assignment {
  id: string
  student_id: string
  room_id: string
  block_id?: string
  academic_year: string
  semester: 'fall' | 'spring'
  assigned_at: string
}

export interface CompatibilityScore {
  id: string
  student_1_id: string
  student_2_id: string
  score: number
  breakdown: {
    sleep_schedule: number
    study_habits: number
    cleanliness: number
    guest_policy: number
    interests: number
  }
  calculated_at: string
}

export interface Waitlist {
  id: string
  student_id: string
  position: number
  priority: 'high' | 'normal' | 'low'
  added_at: string
}
