-- Safe Sample Data Addition Script
-- This script adds sample data without deleting existing data
-- Run SCHEMA_INSPECTION_AND_FIX.sql first to understand your schema

-- ============================================
-- IMPORTANT: BEFORE RUNNING
-- ============================================
-- 1. Run SCHEMA_INSPECTION_AND_FIX.sql first
-- 2. Check the output to see your actual schema
-- 3. Get your existing student_ids from the query at the end
-- 4. Replace the placeholder UUIDs below with actual student_ids OR
--    Create test auth users first and use their IDs

-- ============================================
-- OPTION 1: Add Sample Data Using Existing Students
-- ============================================
-- If you already have students, this adds preferences and assignments for them

-- Add preferences for students who don't have them
-- Using WHERE NOT IN to avoid duplicates (no constraint needed)
INSERT INTO student_preferences (student_id, preferred_room_type, bedtime, noise_level, cleanliness_level, guest_policy_preference)
SELECT 
  s.student_id,
  CASE (RANDOM() * 3)::int
    WHEN 0 THEN 'Single'
    WHEN 1 THEN 'Double'
    ELSE 'Suite'
  END,
  CASE (RANDOM() * 2)::int
    WHEN 0 THEN 'Early Bird'
    ELSE 'Night Owl'
  END,
  (1 + (RANDOM() * 4)::int), -- 1-5
  (1 + (RANDOM() * 4)::int), -- 1-5
  (RANDOM() * 4)::int -- 0-4
FROM students s
WHERE s.student_id NOT IN (SELECT COALESCE(student_id, '00000000-0000-0000-0000-000000000000'::uuid) FROM student_preferences)
LIMIT 15;

-- Add pending assignments for students who don't have them
-- Using WHERE NOT IN to avoid duplicates (no constraint needed)
INSERT INTO room_assignments (student_id, room_id, block_id, status, assignment_date)
SELECT 
  s.student_id,
  NULL,
  NULL,
  'Pending',
  NULL
FROM students s
WHERE s.student_id NOT IN (SELECT COALESCE(student_id, '00000000-0000-0000-0000-000000000000'::uuid) FROM room_assignments)
LIMIT 15;

-- ============================================
-- OPTION 2: Add More Rooms (Safe - won't conflict)
-- ============================================

-- Add more rooms (only if they don't already exist)
-- Check by room_number and dorm_id to avoid duplicates
INSERT INTO rooms (dorm_id, room_number, floor_number, room_type, max_capacity, current_occupancy, wants_suite_bathroom, is_accessible)
SELECT * FROM (VALUES
  -- Single rooms
  (1, '105', 1, 'Single', 1, 0, FALSE, FALSE),
  (1, '106', 1, 'Single', 1, 0, FALSE, TRUE),
  (2, '209', 2, 'Single', 1, 0, FALSE, FALSE),
  (2, '210', 2, 'Single', 1, 0, FALSE, FALSE),
  
  -- Double rooms
  (2, '211', 2, 'Double', 2, 0, FALSE, FALSE),
  (2, '212', 2, 'Double', 2, 0, FALSE, FALSE),
  (3, '307', 3, 'Double', 2, 0, TRUE, FALSE),
  (3, '308', 3, 'Double', 2, 0, TRUE, FALSE),
  
  -- Suite rooms
  (4, '405', 4, 'Suite', 4, 0, TRUE, FALSE),
  (4, '406', 4, 'Suite', 4, 0, TRUE, FALSE),
  (5, '503', 5, 'Suite', 4, 0, TRUE, FALSE),
  (5, '504', 5, 'Suite', 4, 0, TRUE, FALSE)
) AS new_rooms(dorm_id, room_number, floor_number, room_type, max_capacity, current_occupancy, wants_suite_bathroom, is_accessible)
WHERE NOT EXISTS (
  SELECT 1 FROM rooms r 
  WHERE r.dorm_id = new_rooms.dorm_id 
  AND r.room_number = new_rooms.room_number
);

-- ============================================
-- OPTION 3: Reset Some Data for Testing
-- ============================================
-- Uncomment these if you want to reset some assignments for re-testing

-- Reset some room occupancies
-- UPDATE rooms SET current_occupancy = 0 WHERE id BETWEEN 1 AND 20;

-- Set some assignments back to Pending (for re-matching)
-- UPDATE room_assignments 
-- SET status = 'Pending', room_id = NULL, block_id = NULL 
-- WHERE assignment_id BETWEEN 1 AND 11;

-- ============================================
-- VERIFICATION
-- ============================================

-- Count students
SELECT 'Total Students' as metric, COUNT(*) as count FROM students
UNION ALL
-- Count students with preferences
SELECT 'Students with Preferences', COUNT(*) FROM student_preferences
UNION ALL
-- Count pending assignments
SELECT 'Pending Assignments', COUNT(*) FROM room_assignments WHERE status = 'Pending'
UNION ALL
-- Count available rooms
SELECT 'Available Rooms', COUNT(*) FROM rooms WHERE current_occupancy < max_capacity
UNION ALL
-- Count total rooms
SELECT 'Total Rooms', COUNT(*) FROM rooms;

-- Show room type distribution
SELECT 
  room_type,
  COUNT(*) as room_count,
  SUM(max_capacity) as total_capacity,
  SUM(current_occupancy) as current_occupancy,
  SUM(max_capacity) - SUM(current_occupancy) as available_spots
FROM rooms
GROUP BY room_type
ORDER BY room_type;

-- Show students by gender
SELECT 
  gender,
  COUNT(*) as count
FROM students
GROUP BY gender
ORDER BY gender;

-- Show students by year level (handles text type)
SELECT 
  CASE 
    WHEN year_level::text IN ('1', 'Freshman') THEN 'Freshman'
    WHEN year_level::text IN ('2', 'Sophomore') THEN 'Sophomore'
    WHEN year_level::text IN ('3', 'Junior') THEN 'Junior'
    WHEN year_level::text IN ('4', 'Senior') THEN 'Senior'
    ELSE COALESCE(year_level::text, 'Unknown')
  END as year,
  COUNT(*) as count
FROM students
GROUP BY year_level
ORDER BY year_level;

