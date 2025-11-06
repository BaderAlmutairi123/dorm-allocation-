// Client-side exports
export { supabase } from './client'

// Server-side exports
export { supabaseServer, supabaseAdmin } from './server'

// Auth exports
export { authClient, authServer } from './auth'

// Type exports
export type {
  Student,
  Preference,
  Block,
  BlockMember,
  Room,
  Assignment,
  CompatibilityScore,
  Waitlist
} from './types'
