-- Sample Data for Dorm Allocation System
-- This script adds realistic sample data that matches your actual database schema
-- Run this in your Supabase SQL Editor

-- ============================================
-- CLEANUP (Optional - uncomment if you want to start fresh)
-- ============================================
-- DELETE FROM room_assignments;
-- DELETE FROM block_members;
-- DELETE FROM student_blocks;
-- DELETE FROM student_preferences;
-- DELETE FROM students WHERE email LIKE '%@example.com';
-- DELETE FROM rooms WHERE id > 15;

-- ============================================
-- ADD MORE SAMPLE STUDENTS
-- ============================================
-- Note: These use example.com emails since we can't create real auth users
-- In production, students are created via signup which creates auth users

-- Generate sample student UUIDs (you'll need to replace these with actual auth user IDs)
-- For testing, you can use: gen_random_uuid() or create test auth users first

-- Sample students (replace UUIDs with actual auth user IDs from your Supabase Auth)
INSERT INTO students (student_id, email, first_name, last_name, gender, year_level, major, phone, created_at, updated_at)
VALUES
  -- More students for better matching
  (gen_random_uuid(), 'alice.johnson@example.com', 'Alice', 'Johnson', 'Female', 1, 'Computer Science', '5550101', NOW(), NOW()),
  (gen_random_uuid(), 'bob.smith@example.com', 'Bob', 'Smith', 'Male', 1, 'Engineering', '5550102', NOW(), NOW()),
  (gen_random_uuid(), 'charlie.brown@example.com', 'Charlie', 'Brown', 'Male', 2, 'Business', '5550103', NOW(), NOW()),
  (gen_random_uuid(), 'diana.prince@example.com', 'Diana', 'Prince', 'Female', 2, 'Psychology', '5550104', NOW(), NOW()),
  (gen_random_uuid(), 'emma.watson@example.com', 'Emma', 'Watson', 'Female', 1, 'English', '5550105', NOW(), NOW()),
  (gen_random_uuid(), 'frank.miller@example.com', 'Frank', 'Miller', 'Male', 3, 'Mathematics', '5550106', NOW(), NOW()),
  (gen_random_uuid(), 'grace.hopper@example.com', 'Grace', 'Hopper', 'Female', 3, 'Computer Science', '5550107', NOW(), NOW()),
  (gen_random_uuid(), 'henry.ford@example.com', 'Henry', 'Ford', 'Male', 2, 'Engineering', '5550108', NOW(), NOW()),
  (gen_random_uuid(), 'isabella.swan@example.com', 'Isabella', 'Swan', 'Female', 1, 'Biology', '5550109', NOW(), NOW()),
  (gen_random_uuid(), 'jack.sparrow@example.com', 'Jack', 'Sparrow', 'Male', 4, 'Marine Science', '5550110', NOW(), NOW()),
  (gen_random_uuid(), 'kate.bishop@example.com', 'Kate', 'Bishop', 'Female', 2, 'Chemistry', '5550111', NOW(), NOW()),
  (gen_random_uuid(), 'liam.neeson@example.com', 'Liam', 'Neeson', 'Male', 3, 'History', '5550112', NOW(), NOW()),
  (gen_random_uuid(), 'mia.thermopolis@example.com', 'Mia', 'Thermopolis', 'Female', 1, 'Political Science', '5550113', NOW(), NOW()),
  (gen_random_uuid(), 'noah.centineo@example.com', 'Noah', 'Centineo', 'Male', 2, 'Communications', '5550114', NOW(), NOW()),
  (gen_random_uuid(), 'olivia.wilde@example.com', 'Olivia', 'Wilde', 'Female', 3, 'Film Studies', '5550115', NOW(), NOW()),
  (gen_random_uuid(), 'peter.parker@example.com', 'Peter', 'Parker', 'Male', 1, 'Physics', '5550116', NOW(), NOW()),
  (gen_random_uuid(), 'quinn.fabray@example.com', 'Quinn', 'Fabray', 'Female', 2, 'Music', '5550117', NOW(), NOW()),
  (gen_random_uuid(), 'ryan.reynolds@example.com', 'Ryan', 'Reynolds', 'Male', 4, 'Theater', '5550118', NOW(), NOW()),
  (gen_random_uuid(), 'sophia.loren@example.com', 'Sophia', 'Loren', 'Female', 1, 'Art History', '5550119', NOW(), NOW()),
  (gen_random_uuid(), 'thomas.shelby@example.com', 'Thomas', 'Shelby', 'Male', 3, 'Economics', '5550120', NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;

-- ============================================
-- ADD STUDENT PREFERENCES
-- ============================================
-- Get the student_ids we just inserted (or use existing ones)
-- This assumes you have students in the database

-- For each student, add diverse preferences for better matching
-- Note: Replace the student_id values with actual UUIDs from your students table

-- Example preferences (you'll need to replace student_id with actual values)
-- You can run this query first to get student IDs:
-- SELECT student_id, email FROM students ORDER BY created_at DESC LIMIT 20;

-- Then use those IDs in the INSERT below
-- For now, this is a template - you'll need to replace the UUIDs

INSERT INTO student_preferences (student_id, preferred_room_type, bedtime, noise_level, cleanliness_level, guest_policy_preference, created_at, updated_at)
SELECT 
  student_id,
  CASE (RANDOM() * 3)::int
    WHEN 0 THEN 'Single'
    WHEN 1 THEN 'Double'
    ELSE 'Suite'
  END as preferred_room_type,
  CASE (RANDOM() * 2)::int
    WHEN 0 THEN 'Early Bird'
    ELSE 'Night Owl'
  END as bedtime,
  (1 + (RANDOM() * 4)::int) as noise_level, -- 1-5
  (1 + (RANDOM() * 4)::int) as cleanliness_level, -- 1-5
  (RANDOM() * 4)::int as guest_policy_preference, -- 0-4
  NOW(),
  NOW()
FROM students
WHERE student_id NOT IN (SELECT student_id FROM student_preferences)
LIMIT 20
ON CONFLICT (student_id) DO NOTHING;

-- ============================================
-- ADD MORE ROOMS
-- ============================================
-- Add more rooms with various types and capacities

INSERT INTO rooms (dorm_id, room_number, floor_number, room_type, max_capacity, current_occupancy, wants_suite_bathroom, is_accessible, created_at, updated_at)
VALUES
  -- More Single rooms
  (1, '103', 1, 'Single', 1, 0, FALSE, FALSE, NOW(), NOW()),
  (1, '104', 1, 'Single', 1, 0, FALSE, TRUE, NOW(), NOW()),
  (1, '202', 2, 'Single', 1, 0, FALSE, FALSE, NOW(), NOW()),
  (1, '203', 2, 'Single', 1, 0, FALSE, FALSE, NOW(), NOW()),
  (1, '204', 2, 'Single', 1, 0, FALSE, TRUE, NOW(), NOW()),
  
  -- More Double rooms
  (2, '107', 1, 'Double', 2, 0, FALSE, FALSE, NOW(), NOW()),
  (2, '108', 1, 'Double', 2, 0, FALSE, FALSE, NOW(), NOW()),
  (2, '206', 2, 'Double', 2, 0, FALSE, FALSE, NOW(), NOW()),
  (2, '207', 2, 'Double', 2, 0, FALSE, FALSE, NOW(), NOW()),
  (2, '208', 2, 'Double', 2, 0, FALSE, TRUE, NOW(), NOW()),
  (3, '303', 3, 'Double', 2, 0, TRUE, FALSE, NOW(), NOW()),
  (3, '304', 3, 'Double', 2, 0, TRUE, FALSE, NOW(), NOW()),
  
  -- More Suite rooms
  (4, '402', 4, 'Suite', 4, 0, TRUE, FALSE, NOW(), NOW()),
  (4, '403', 4, 'Suite', 4, 0, TRUE, FALSE, NOW(), NOW()),
  (4, '404', 4, 'Suite', 4, 0, TRUE, FALSE, NOW(), NOW()),
  (5, '501', 5, 'Suite', 4, 0, TRUE, FALSE, NOW(), NOW()),
  (5, '502', 5, 'Suite', 4, 0, TRUE, FALSE, NOW(), NOW()),
  
  -- Triple rooms (if your system supports them)
  (3, '305', 3, 'Double', 3, 0, FALSE, FALSE, NOW(), NOW()),
  (3, '306', 3, 'Double', 3, 0, FALSE, FALSE, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ============================================
-- ADD PENDING ROOM ASSIGNMENTS
-- ============================================
-- Create pending assignments for students who haven't been assigned yet
-- This allows the matching algorithm to work

-- Get students who don't have assignments yet
INSERT INTO room_assignments (student_id, room_id, block_id, status, assignment_date, created_at, updated_at)
SELECT 
  s.student_id,
  NULL as room_id, -- Will be assigned by matching algorithm
  NULL as block_id, -- Will be assigned if matched with others
  'Pending' as status,
  NULL as assignment_date,
  NOW(),
  NOW()
FROM students s
WHERE s.student_id NOT IN (SELECT student_id FROM room_assignments)
LIMIT 25
ON CONFLICT (student_id) DO NOTHING;

-- ============================================
-- UPDATE EXISTING DATA FOR CONSISTENCY
-- ============================================

-- Reset some room occupancies to 0 for testing (if needed)
-- UPDATE rooms SET current_occupancy = 0 WHERE id IN (9, 10, 15);

-- Set some assignments back to Pending for re-matching (if needed)
-- UPDATE room_assignments SET status = 'Pending', room_id = NULL WHERE assignment_id IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check how many students we have
-- SELECT COUNT(*) as total_students FROM students;

-- Check how many pending assignments
-- SELECT COUNT(*) as pending_assignments FROM room_assignments WHERE status = 'Pending';

-- Check available rooms
-- SELECT COUNT(*) as available_rooms FROM rooms WHERE current_occupancy < max_capacity;

-- Check students with preferences
-- SELECT COUNT(*) as students_with_preferences FROM student_preferences;

-- Check room types distribution
-- SELECT room_type, COUNT(*) as count, SUM(max_capacity) as total_capacity 
-- FROM rooms 
-- GROUP BY room_type;

