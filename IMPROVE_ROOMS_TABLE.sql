-- Improve Rooms Table Structure
-- This script improves the rooms table to make more sense
-- Run this in your Supabase SQL Editor

-- ============================================
-- OPTION 1: Rename columns for clarity
-- ============================================

-- Rename wants_suite_bathroom to has_suite_bathroom (more accurate - it's a room feature)
ALTER TABLE rooms 
RENAME COLUMN wants_suite_bathroom TO has_suite_bathroom;

-- ============================================
-- OPTION 2: Add better room features (if you want more detail)
-- ============================================

-- Add has_private_bathroom (more specific than suite)
-- ALTER TABLE rooms ADD COLUMN IF NOT EXISTS has_private_bathroom BOOLEAN DEFAULT FALSE;

-- Add has_shared_bathroom (opposite of private)
-- ALTER TABLE rooms ADD COLUMN IF NOT EXISTS has_shared_bathroom BOOLEAN DEFAULT TRUE;

-- Add room_features as JSONB for flexible features (optional)
-- ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_features JSONB DEFAULT '{}'::jsonb;
-- This could store: {"air_conditioning": true, "heating": true, "wifi": true, "furnished": true}

-- ============================================
-- OPTION 3: Simplify - remove confusing columns
-- ============================================

-- If you want to remove wants_suite_bathroom entirely and just use room_type
-- (Suite rooms would imply they have suite bathrooms)
-- ALTER TABLE rooms DROP COLUMN IF EXISTS wants_suite_bathroom;

-- ============================================
-- RECOMMENDED: Clean structure
-- ============================================

-- After running Option 1, your rooms table will have:
-- - id (primary key)
-- - dorm_id (which building)
-- - room_number (e.g., "101", "2A")
-- - floor_number (which floor)
-- - room_type (Single, Double, Suite)
-- - max_capacity (how many students can fit)
-- - current_occupancy (how many are currently assigned)
-- - has_suite_bathroom (does this room have a private/suite bathroom?)
-- - is_accessible (is this room ADA accessible?)

-- This makes more sense:
-- - has_suite_bathroom = room feature (not a preference)
-- - is_accessible = room feature (accessibility requirement)

-- ============================================
-- VERIFICATION
-- ============================================

-- Check the updated structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'rooms' 
ORDER BY ordinal_position;

