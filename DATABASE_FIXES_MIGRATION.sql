-- =====================================================
-- Database Schema Fixes Migration
-- Fixes issues found between code and database schema
-- =====================================================

-- =====================================================
-- 1. FIX: Add missing columns to rooms table
-- =====================================================
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS wants_suite_bathroom BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_accessible BOOLEAN DEFAULT FALSE;

-- =====================================================
-- 2. FIX: Add code column to student_blocks table
-- =====================================================
ALTER TABLE student_blocks 
ADD COLUMN IF NOT EXISTS code VARCHAR(50) UNIQUE;

-- Create index on code for faster lookups
CREATE INDEX IF NOT EXISTS idx_student_blocks_code ON student_blocks(code);

-- =====================================================
-- 3. FIX: Change year_level from VARCHAR to INTEGER
-- =====================================================
-- First, update any existing string values to integers
-- This assumes your current data is already in numeric format or needs conversion
-- If you have text values like 'Freshman', 'Sophomore', etc., we'll need a different approach

-- Option A: If year_level currently stores numbers as strings (e.g., '1', '2', '3', '4')
ALTER TABLE students 
ALTER COLUMN year_level TYPE INTEGER USING year_level::INTEGER;

-- Option B: If year_level stores text values, uncomment this instead:
-- ALTER TABLE students 
-- ALTER COLUMN year_level TYPE INTEGER USING 
--   CASE year_level
--     WHEN 'Freshman' THEN 1
--     WHEN 'Sophomore' THEN 2
--     WHEN 'Junior' THEN 3
--     WHEN 'Senior' THEN 4
--     ELSE 1
--   END;

-- Add check constraint to ensure valid year levels
ALTER TABLE students 
DROP CONSTRAINT IF EXISTS students_year_level_check;

ALTER TABLE students 
ADD CONSTRAINT students_year_level_check 
CHECK (year_level BETWEEN 1 AND 4);

-- =====================================================
-- 4. FIX: Add timestamps to room_assignments (optional but recommended)
-- =====================================================
ALTER TABLE room_assignments 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_room_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_room_assignments_updated_at ON room_assignments;

CREATE TRIGGER update_room_assignments_updated_at 
BEFORE UPDATE ON room_assignments
FOR EACH ROW 
EXECUTE FUNCTION update_room_assignments_updated_at();

-- =====================================================
-- 5. FIX: Ensure block_members has proper unique constraint
-- =====================================================
-- Check if unique constraint exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'block_members_block_id_student_id_key'
    ) THEN
        ALTER TABLE block_members 
        ADD CONSTRAINT block_members_block_id_student_id_key 
        UNIQUE (block_id, student_id);
    END IF;
END $$;

-- =====================================================
-- VERIFICATION QUERIES (Run these to verify fixes)
-- =====================================================

-- Check rooms table has new columns
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'rooms' 
-- AND column_name IN ('wants_suite_bathroom', 'is_accessible');

-- Check student_blocks has code column
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'student_blocks' 
-- AND column_name = 'code';

-- Check year_level is INTEGER
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'students' 
-- AND column_name = 'year_level';

-- Check room_assignments has timestamps
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'room_assignments' 
-- AND column_name IN ('created_at', 'updated_at');

