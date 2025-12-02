import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client with service role key for admin operations
// This should ONLY be used in server-side code (API routes, server components)
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL environment variable')
}

// For regular server-side operations (uses anon key)
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
}

// Function to create a server-side Supabase client (for API routes)
// Returns a promise to maintain compatibility with existing code
export async function supabaseServer() {
  return createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Also export as a constant for direct usage
export const supabaseServerClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Admin client for privileged operations (only use when necessary)
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

// Warn if admin client is not available
if (!supabaseAdmin) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY not set - admin operations will not be available')
}
