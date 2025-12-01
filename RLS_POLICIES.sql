-- Row Level Security (RLS) Policies for Dorm Allocation System
-- Run these in your Supabase SQL Editor to enable proper security

-- Enable RLS on all tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STUDENTS TABLE POLICIES
-- ============================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Students can view own profile" ON students;
DROP POLICY IF EXISTS "Students can update own profile" ON students;
DROP POLICY IF EXISTS "Students can insert own profile" ON students;

-- Students can read their own record
CREATE POLICY "Students can view own profile"
  ON students FOR SELECT
  USING (auth.uid() = student_id);

-- Students can update their own record
CREATE POLICY "Students can update own profile"
  ON students FOR UPDATE
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- Students can insert their own record (for application submission)
CREATE POLICY "Students can insert own profile"
  ON students FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- ============================================
-- STUDENT_PREFERENCES TABLE POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Students can view own preferences" ON student_preferences;
DROP POLICY IF EXISTS "Students can manage own preferences" ON student_preferences;

-- Students can read their own preferences
CREATE POLICY "Students can view own preferences"
  ON student_preferences FOR SELECT
  USING (auth.uid() = student_id);

-- Students can insert/update/delete their own preferences
CREATE POLICY "Students can manage own preferences"
  ON student_preferences FOR ALL
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- ============================================
-- ROOM_ASSIGNMENTS TABLE POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Students can view own assignment" ON room_assignments;
DROP POLICY IF EXISTS "Students can insert own assignment" ON room_assignments;

-- Students can read their own assignment
CREATE POLICY "Students can view own assignment"
  ON room_assignments FOR SELECT
  USING (auth.uid() = student_id);

-- Students can insert their own assignment (when submitting application)
CREATE POLICY "Students can insert own assignment"
  ON room_assignments FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Note: Updates to room_assignments (like status changes, room assignments)
-- should be done by admin/matching algorithm using service role key
-- This is intentional - students shouldn't be able to modify their own assignments

-- ============================================
-- ROOMS TABLE POLICIES (if RLS is enabled)
-- ============================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Authenticated users can view rooms" ON rooms;

-- Allow all authenticated users to read rooms (for viewing availability)
-- This assumes you want students to see available rooms
CREATE POLICY "Authenticated users can view rooms"
  ON rooms FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify policies are created (run these to check):
-- SELECT * FROM pg_policies WHERE tablename = 'students';
-- SELECT * FROM pg_policies WHERE tablename = 'student_preferences';
-- SELECT * FROM pg_policies WHERE tablename = 'room_assignments';

