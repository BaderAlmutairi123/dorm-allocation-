-- Schema Inspection and Compatibility Fix Script
-- This script helps identify your actual schema and ensures compatibility

-- ============================================
-- STEP 1: INSPECT YOUR CURRENT SCHEMA
-- ============================================

-- Check students table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'students' 
ORDER BY ordinal_position;

-- Check student_preferences table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'student_preferences' 
ORDER BY ordinal_position;

-- Check rooms table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'rooms' 
ORDER BY ordinal_position;

-- Check room_assignments table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'room_assignments' 
ORDER BY ordinal_position;

-- Check student_blocks table structure (if it exists)
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'student_blocks' 
ORDER BY ordinal_position;

-- Check block_members table structure (if it exists)
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'block_members' 
ORDER BY ordinal_position;

-- ============================================
-- STEP 2: FIX SCHEMA COMPATIBILITY ISSUES
-- ============================================

-- Ensure student_preferences has student_id as primary key (for upsert to work)
-- If it doesn't have a unique constraint, add one
DO $$
BEGIN
  -- Check if unique constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'student_preferences_student_id_key' 
    OR conname = 'student_preferences_pkey'
  ) THEN
    -- Add unique constraint if it doesn't exist
    ALTER TABLE student_preferences 
    ADD CONSTRAINT student_preferences_student_id_key UNIQUE (student_id);
  END IF;
END $$;

-- Ensure room_assignments has unique constraint on student_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'room_assignments_student_id_key'
  ) THEN
    ALTER TABLE room_assignments 
    ADD CONSTRAINT room_assignments_student_id_key UNIQUE (student_id);
  END IF;
END $$;

-- ============================================
-- STEP 3: ADD MISSING COLUMNS IF NEEDED
-- ============================================

-- Add created_at and updated_at to student_blocks if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'student_blocks' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE student_blocks ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'student_blocks' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE student_blocks ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Add created_at to block_members if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'block_members' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE block_members ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- ============================================
-- STEP 4: GET EXISTING STUDENT IDs FOR SAMPLE DATA
-- ============================================

-- Run this query to see your existing students
-- Copy the student_id values to use in the sample data script
-- Note: year_level appears to be stored as text/varchar, so we compare as text
SELECT 
  student_id, 
  email, 
  first_name, 
  last_name,
  year_level,
  CASE 
    WHEN year_level::text IN ('1', 'Freshman') THEN 'Freshman'
    WHEN year_level::text IN ('2', 'Sophomore') THEN 'Sophomore'
    WHEN year_level::text IN ('3', 'Junior') THEN 'Junior'
    WHEN year_level::text IN ('4', 'Senior') THEN 'Senior'
    ELSE COALESCE(year_level::text, 'NULL')
  END as year_display
FROM students 
ORDER BY student_id 
LIMIT 30;

