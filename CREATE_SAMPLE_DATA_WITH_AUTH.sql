-- =====================================================
-- Complete Sample Data Creation with Auth Users
-- =====================================================
-- This script creates auth users AND student records
-- Run this in Supabase SQL Editor

-- =====================================================
-- 1. CREATE AUTH USERS (if auth.users table allows direct inserts)
-- =====================================================
-- Note: Supabase auth.users is typically managed through the auth API
-- You may need to create users through the signup API or Supabase dashboard first
-- Then use their IDs in the students table below

-- Alternative: Create users via Supabase Dashboard or API, then use their IDs

-- =====================================================
-- 2. INSERT SAMPLE STUDENTS
-- =====================================================
-- Replace the UUIDs below with actual auth user IDs from auth.users
-- Or use the simplified version that generates test UUIDs

-- First, let's get some existing auth user IDs (if any exist)
-- If you have existing users, you can use their IDs:

-- Option A: Use existing auth users
-- Uncomment and modify this to use your existing users:
/*
INSERT INTO students (student_id, email, first_name, last_name, phone, gender, year_level, major)
SELECT 
  id as student_id,
  email,
  raw_user_meta_data->>'first_name' as first_name,
  raw_user_meta_data->>'last_name' as last_name,
  '5165550000' as phone,
  'Male' as gender,
  1 as year_level,
  'Computer Science' as major
FROM auth.users
WHERE id NOT IN (SELECT student_id FROM students)
LIMIT 10;
*/

-- Option B: Insert with generated UUIDs (for testing without auth)
-- This creates students that won't be able to log in, but can be matched
-- Using WHERE NOT EXISTS to avoid conflicts
INSERT INTO students (student_id, email, first_name, last_name, phone, gender, year_level, major)
SELECT * FROM (VALUES
-- Male Students
(gen_random_uuid(), 'john.doe@hofstra.edu', 'John', 'Doe', '5165550101', 'Male', 1, 'Computer Science'),
(gen_random_uuid(), 'mike.smith@hofstra.edu', 'Mike', 'Smith', '5165550102', 'Male', 1, 'Engineering'),
(gen_random_uuid(), 'david.jones@hofstra.edu', 'David', 'Jones', '5165550103', 'Male', 2, 'Business'),
(gen_random_uuid(), 'chris.brown@hofstra.edu', 'Chris', 'Brown', '5165550104', 'Male', 2, 'Mathematics'),
(gen_random_uuid(), 'alex.wilson@hofstra.edu', 'Alex', 'Wilson', '5165550105', 'Male', 1, 'Biology'),
(gen_random_uuid(), 'ryan.miller@hofstra.edu', 'Ryan', 'Miller', '5165550106', 'Male', 3, 'Psychology'),
(gen_random_uuid(), 'james.taylor@hofstra.edu', 'James', 'Taylor', '5165550107', 'Male', 1, 'Economics'),
(gen_random_uuid(), 'william.anderson@hofstra.edu', 'William', 'Anderson', '5165550108', 'Male', 2, 'Chemistry'),
(gen_random_uuid(), 'thomas.martin@hofstra.edu', 'Thomas', 'Martin', '5165550109', 'Male', 1, 'Physics'),
(gen_random_uuid(), 'daniel.thompson@hofstra.edu', 'Daniel', 'Thompson', '5165550110', 'Male', 2, 'Computer Science'),

-- Female Students
(gen_random_uuid(), 'emily.davis@hofstra.edu', 'Emily', 'Davis', '5165550111', 'Female', 1, 'Nursing'),
(gen_random_uuid(), 'sarah.garcia@hofstra.edu', 'Sarah', 'Garcia', '5165550112', 'Female', 1, 'Biology'),
(gen_random_uuid(), 'jessica.rodriguez@hofstra.edu', 'Jessica', 'Rodriguez', '5165550113', 'Female', 2, 'Psychology'),
(gen_random_uuid(), 'ashley.lewis@hofstra.edu', 'Ashley', 'Lewis', '5165550114', 'Female', 2, 'Business'),
(gen_random_uuid(), 'amanda.lee@hofstra.edu', 'Amanda', 'Lee', '5165550115', 'Female', 1, 'English'),
(gen_random_uuid(), 'jennifer.walker@hofstra.edu', 'Jennifer', 'Walker', '5165550116', 'Female', 3, 'Mathematics'),
(gen_random_uuid(), 'lisa.hall@hofstra.edu', 'Lisa', 'Hall', '5165550117', 'Female', 1, 'Chemistry'),
(gen_random_uuid(), 'michelle.allen@hofstra.edu', 'Michelle', 'Allen', '5165550118', 'Female', 2, 'Engineering'),
(gen_random_uuid(), 'nicole.young@hofstra.edu', 'Nicole', 'Young', '5165550119', 'Female', 1, 'Computer Science'),
(gen_random_uuid(), 'stephanie.king@hofstra.edu', 'Stephanie', 'King', '5165550120', 'Female', 2, 'Nursing')
) AS v(student_id, email, first_name, last_name, phone, gender, year_level, major)
WHERE NOT EXISTS (SELECT 1 FROM students WHERE students.email = v.email);

-- =====================================================
-- 3. INSERT STUDENT PREFERENCES
-- =====================================================

-- Get the student IDs we just inserted and add preferences
WITH male_students AS (
  SELECT student_id, ROW_NUMBER() OVER (ORDER BY student_id) as rn
  FROM students 
  WHERE gender = 'Male' 
  AND student_id NOT IN (SELECT student_id FROM student_preferences)
  ORDER BY student_id
  LIMIT 10
),
female_students AS (
  SELECT student_id, ROW_NUMBER() OVER (ORDER BY student_id) as rn
  FROM students 
  WHERE gender = 'Female' 
  AND student_id NOT IN (SELECT student_id FROM student_preferences)
  ORDER BY student_id
  LIMIT 10
)
INSERT INTO student_preferences (student_id, preferred_room_type, bedtime, noise_level, cleanliness_level, guest_policy_preference)
SELECT 
  student_id,
  CASE 
    WHEN rn IN (6, 16) THEN 'Single'
    WHEN rn IN (8, 18) THEN 'Suite'
    ELSE 'Double'
  END as preferred_room_type,
  CASE 
    WHEN rn IN (1, 2, 6, 9, 11, 12, 16, 19) THEN 'Early Bird'
    WHEN rn IN (3, 4, 8, 13, 14, 18) THEN 'Night Owl'
    ELSE 'Early Bird'  -- Default to Early Bird (Flexible not allowed by constraint)
  END as bedtime,
  CASE 
    WHEN rn IN (1, 2, 6, 9, 11, 12, 16, 19) THEN 2
    WHEN rn IN (3, 4, 8, 13, 14, 18) THEN 4
    ELSE 3
  END as noise_level,
  CASE 
    WHEN rn IN (1, 2, 9, 11, 19) THEN 5
    WHEN rn IN (4, 13) THEN 2
    ELSE 3
  END as cleanliness_level,
  CASE 
    WHEN rn IN (1, 2, 6, 9, 11, 12, 16, 19) THEN 1
    WHEN rn IN (8, 14, 18) THEN 4
    ELSE 2
  END as guest_policy_preference
FROM (
  SELECT student_id, rn FROM male_students
  UNION ALL
  SELECT student_id, rn + 10 as rn FROM female_students
) all_students
WHERE NOT EXISTS (
  SELECT 1 FROM student_preferences WHERE student_preferences.student_id = all_students.student_id
);

-- =====================================================
-- 4. CREATE PENDING ROOM ASSIGNMENTS
-- =====================================================

-- Create pending assignments for students without assignments
-- First, insert new assignments
INSERT INTO room_assignments (student_id, room_id, block_id, status, assignment_date)
SELECT 
  s.student_id,
  NULL as room_id,
  NULL as block_id,
  'Pending' as status,
  NULL as assignment_date
FROM students s
WHERE s.student_id NOT IN (SELECT student_id FROM room_assignments);

-- Then, update existing assignments to Pending if needed
UPDATE room_assignments
SET 
  room_id = NULL,
  block_id = NULL,
  status = 'Pending',
  assignment_date = NULL
WHERE student_id IN (
  SELECT student_id FROM students 
  WHERE student_id IN (SELECT student_id FROM room_assignments)
)
AND status != 'Pending';

-- =====================================================
-- 5. OPTIONAL: CREATE TEST BLOCKS
-- =====================================================

-- Fix sequence for block_members if it's out of sync
-- This ensures the auto-increment sequence is set to the correct value
DO $$
DECLARE
  max_id INTEGER;
  seq_name TEXT;
BEGIN
  SELECT COALESCE(MAX(membership_id), 0) INTO max_id FROM block_members;
  seq_name := pg_get_serial_sequence('block_members', 'membership_id');
  IF seq_name IS NOT NULL AND max_id > 0 THEN
    -- Set sequence to max_id with is_called=true (next value will be max_id + 1)
    PERFORM setval(seq_name, max_id, true);
  END IF;
END $$;

-- Create a block for 2 compatible male students (Early Birds, quiet, clean)
DO $$
DECLARE
  v_block_id INTEGER;
  v_leader_id UUID;
BEGIN
  -- Get compatible male students
  WITH compatible_males AS (
    SELECT s.student_id
    FROM students s
    JOIN student_preferences sp ON s.student_id = sp.student_id
    WHERE s.gender = 'Male'
    AND sp.bedtime = 'Early Bird'
    AND sp.noise_level <= 2
    AND sp.cleanliness_level >= 4
    AND s.student_id NOT IN (SELECT student_id FROM block_members)
    LIMIT 2
  )
  SELECT student_id INTO v_leader_id FROM compatible_males LIMIT 1;
  
  -- Check if block already exists, if not create it
  SELECT block_id INTO v_block_id 
  FROM student_blocks 
  WHERE code = 'BLK-TEST-MALE-001';
  
  IF v_block_id IS NULL AND v_leader_id IS NOT NULL THEN
    INSERT INTO student_blocks (block_leader_id, max_capacity, current_capacity, code)
    VALUES (v_leader_id, 4, 0, 'BLK-TEST-MALE-001')
    RETURNING block_id INTO v_block_id;
  END IF;
  
  -- Add members to the block (only if they're not already members)
  IF v_block_id IS NOT NULL THEN
    INSERT INTO block_members (block_id, student_id, joined_date, is_leader)
    SELECT 
      v_block_id,
      s.student_id,
      CURRENT_DATE,
      (s.student_id = v_leader_id) as is_leader
    FROM students s
    JOIN student_preferences sp ON s.student_id = sp.student_id
    WHERE s.gender = 'Male'
    AND sp.bedtime = 'Early Bird'
    AND sp.noise_level <= 2
    AND sp.cleanliness_level >= 4
    AND NOT EXISTS (
      SELECT 1 FROM block_members bm 
      WHERE bm.student_id = s.student_id
    )
    AND v_block_id IS NOT NULL
    LIMIT 2;
  END IF;
END $$;

-- Update room assignments with block_id
UPDATE room_assignments ra
SET block_id = (SELECT block_id FROM student_blocks WHERE code = 'BLK-TEST-MALE-001' LIMIT 1)
WHERE ra.student_id IN (
  SELECT student_id FROM block_members 
  WHERE block_id = (SELECT block_id FROM student_blocks WHERE code = 'BLK-TEST-MALE-001' LIMIT 1)
)
AND ra.status = 'Pending';

-- Create a block for 2 compatible female students
DO $$
DECLARE
  v_block_id INTEGER;
  v_leader_id UUID;
BEGIN
  -- Get compatible female students
  WITH compatible_females AS (
    SELECT s.student_id
    FROM students s
    JOIN student_preferences sp ON s.student_id = sp.student_id
    WHERE s.gender = 'Female'
    AND sp.bedtime = 'Early Bird'
    AND sp.noise_level <= 2
    AND sp.cleanliness_level >= 4
    AND s.student_id NOT IN (SELECT student_id FROM block_members)
    LIMIT 2
  )
  SELECT student_id INTO v_leader_id FROM compatible_females LIMIT 1;
  
  -- Check if block already exists, if not create it
  SELECT block_id INTO v_block_id 
  FROM student_blocks 
  WHERE code = 'BLK-TEST-FEMALE-001';
  
  IF v_block_id IS NULL AND v_leader_id IS NOT NULL THEN
    INSERT INTO student_blocks (block_leader_id, max_capacity, current_capacity, code)
    VALUES (v_leader_id, 4, 0, 'BLK-TEST-FEMALE-001')
    RETURNING block_id INTO v_block_id;
  END IF;
  
  -- Add members to the block (only if they're not already members)
  IF v_block_id IS NOT NULL THEN
    INSERT INTO block_members (block_id, student_id, joined_date, is_leader)
    SELECT 
      v_block_id,
      s.student_id,
      CURRENT_DATE,
      (s.student_id = v_leader_id) as is_leader
    FROM students s
    JOIN student_preferences sp ON s.student_id = sp.student_id
    WHERE s.gender = 'Female'
    AND sp.bedtime = 'Early Bird'
    AND sp.noise_level <= 2
    AND sp.cleanliness_level >= 4
    AND NOT EXISTS (
      SELECT 1 FROM block_members bm 
      WHERE bm.student_id = s.student_id
    )
    AND v_block_id IS NOT NULL
    LIMIT 2;
  END IF;
END $$;

UPDATE room_assignments ra
SET block_id = (SELECT block_id FROM student_blocks WHERE code = 'BLK-TEST-FEMALE-001' LIMIT 1)
WHERE ra.student_id IN (
  SELECT student_id FROM block_members 
  WHERE block_id = (SELECT block_id FROM student_blocks WHERE code = 'BLK-TEST-FEMALE-001' LIMIT 1)
)
AND ra.status = 'Pending';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Count pending students
SELECT COUNT(*) as pending_students 
FROM room_assignments 
WHERE status = 'Pending';

-- Count available rooms
SELECT COUNT(*) as available_rooms 
FROM rooms 
WHERE current_occupancy < max_capacity;

-- View pending students with details
SELECT 
  s.student_id,
  s.first_name || ' ' || s.last_name as name,
  s.gender,
  s.year_level,
  sp.preferred_room_type,
  sp.bedtime,
  ra.status,
  ra.block_id
FROM room_assignments ra
JOIN students s ON ra.student_id = s.student_id
LEFT JOIN student_preferences sp ON s.student_id = sp.student_id
WHERE ra.status = 'Pending'
ORDER BY s.gender, s.last_name;

