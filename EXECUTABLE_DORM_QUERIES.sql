-- Executable SQL Queries for Dorm Allocation System
-- These can be run directly in Supabase SQL Editor
-- Replace example values with your actual parameters

-- ============================================
-- 1. CREATE PROPER FOREIGN KEY RELATIONSHIP
-- ============================================
-- Make sure rooms table has a foreign key to dorms
-- (Run this if you haven't already set up the relationship)
-- Note: If the constraint already exists, this will error - that's okay, just skip it

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_rooms_dorm_id'
    ) THEN
        ALTER TABLE rooms 
        ADD CONSTRAINT fk_rooms_dorm_id 
        FOREIGN KEY (dorm_id) REFERENCES dorms(dorm_id) ON DELETE RESTRICT;
    END IF;
END $$;

-- ============================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Index for rooms queries by dorm_id (most common filter)
CREATE INDEX IF NOT EXISTS idx_rooms_dorm_id ON rooms(dorm_id);

-- Index for rooms queries by availability (used in matching algorithm)
CREATE INDEX IF NOT EXISTS idx_rooms_availability 
ON rooms(dorm_id, current_occupancy, max_capacity) 
WHERE current_occupancy < max_capacity;

-- Index for rooms by room type (used in preference matching)
CREATE INDEX IF NOT EXISTS idx_rooms_type ON rooms(room_type);

-- Index for rooms by floor (for floor-based queries)
CREATE INDEX IF NOT EXISTS idx_rooms_floor ON rooms(dorm_id, floor_number);

-- Composite index for common room queries
CREATE INDEX IF NOT EXISTS idx_rooms_composite 
ON rooms(dorm_id, room_type, floor_number, current_occupancy);

-- ============================================
-- 3. EXECUTABLE QUERIES (Replace values as needed)
-- ============================================

-- Query 1: Get all available rooms with dorm information
-- Used by: Matching algorithm, room listing API
SELECT 
    r.room_id,
    r.room_number,
    r.floor_number,
    r.room_type,
    r.max_capacity,
    r.current_occupancy,
    (r.max_capacity - r.current_occupancy) AS available_spots,
    r.dorm_id,
    r.wants_suite_bathroom,
    r.is_accessible,
    d.dorm_name,
    d.address,
    d.dorm_gender,
    d.dorm_type
FROM rooms r
INNER JOIN dorms d ON r.dorm_id = d.dorm_id
WHERE r.current_occupancy < r.max_capacity
ORDER BY d.dorm_name, r.floor_number, r.room_number;

-- Query 2: Get available rooms by dorm building
-- Replace 1 with your dorm_id
SELECT 
    r.room_id,
    r.room_number,
    r.floor_number,
    r.room_type,
    r.max_capacity,
    r.current_occupancy,
    (r.max_capacity - r.current_occupancy) AS available_spots,
    r.wants_suite_bathroom,
    r.is_accessible,
    d.dorm_name,
    d.dorm_gender,
    d.dorm_type
FROM rooms r
INNER JOIN dorms d ON r.dorm_id = d.dorm_id
WHERE r.dorm_id = 1  -- Replace with your dorm_id
  AND r.current_occupancy < r.max_capacity
ORDER BY r.floor_number, r.room_number;

-- Query 3: Get available rooms by floor
-- Replace 1 with dorm_id and 2 with floor_number
SELECT 
    r.room_id,
    r.room_number,
    r.room_type,
    r.max_capacity,
    r.current_occupancy,
    (r.max_capacity - r.current_occupancy) AS available_spots,
    r.wants_suite_bathroom,
    r.is_accessible,
    d.dorm_name,
    d.dorm_gender
FROM rooms r
INNER JOIN dorms d ON r.dorm_id = d.dorm_id
WHERE r.dorm_id = 1  -- Replace with your dorm_id
  AND r.floor_number = 2  -- Replace with your floor_number
  AND r.current_occupancy < r.max_capacity
ORDER BY r.room_number;

-- Query 4: Get available rooms by room type
-- Replace 'Double' with 'Single', 'Double', or 'Suite'
SELECT 
    r.room_id,
    r.room_number,
    r.floor_number,
    r.max_capacity,
    r.current_occupancy,
    (r.max_capacity - r.current_occupancy) AS available_spots,
    r.dorm_id,
    r.wants_suite_bathroom,
    r.is_accessible,
    d.dorm_name,
    d.dorm_gender,
    d.dorm_type
FROM rooms r
INNER JOIN dorms d ON r.dorm_id = d.dorm_id
WHERE LOWER(r.room_type) = LOWER('Double')  -- Replace with 'Single', 'Double', or 'Suite'
  AND r.current_occupancy < r.max_capacity
ORDER BY d.dorm_name, r.floor_number, r.room_number;

-- Query 5: Get available rooms matching student preferences
-- Replace 'Double' with room_type preference (or use NULL for any)
-- Replace 'Co-ed' with student gender (or 'Male', 'Female')
SELECT 
    r.room_id,
    r.room_number,
    r.floor_number,
    r.room_type,
    r.max_capacity,
    r.current_occupancy,
    (r.max_capacity - r.current_occupancy) AS available_spots,
    r.dorm_id,
    r.wants_suite_bathroom,
    r.is_accessible,
    d.dorm_name,
    d.dorm_gender,
    d.dorm_type
FROM rooms r
INNER JOIN dorms d ON r.dorm_id = d.dorm_id
WHERE r.current_occupancy < r.max_capacity
  AND (
    -- Match room type preference (use NULL to ignore)
    ('Double' IS NULL OR LOWER(r.room_type) = LOWER('Double'))
    -- Match dorm gender (Co-ed matches all, or specific gender)
    AND (d.dorm_gender = 'Co-ed' OR d.dorm_gender = 'Co-ed')
  )
ORDER BY 
    -- Prioritize exact room type matches
    CASE WHEN 'Double' IS NOT NULL AND LOWER(r.room_type) = LOWER('Double') THEN 0 ELSE 1 END,
    d.dorm_name,
    r.floor_number,
    r.room_number;

-- Query 6: Get room statistics by dorm
-- Used by: Dashboard, status API
SELECT 
    d.dorm_id,
    d.dorm_name,
    COUNT(r.room_id) AS total_rooms,
    SUM(r.max_capacity) AS total_capacity,
    SUM(r.current_occupancy) AS total_occupied,
    SUM(r.max_capacity) - SUM(r.current_occupancy) AS total_available,
    COUNT(CASE WHEN r.current_occupancy < r.max_capacity THEN 1 END) AS available_rooms,
    COUNT(CASE WHEN r.current_occupancy >= r.max_capacity THEN 1 END) AS full_rooms
FROM dorms d
LEFT JOIN rooms r ON d.dorm_id = r.dorm_id
GROUP BY d.dorm_id, d.dorm_name
ORDER BY d.dorm_name;

-- Query 7: Get room statistics by floor
-- Used by: Floor-based analytics
SELECT 
    d.dorm_id,
    d.dorm_name,
    r.floor_number,
    COUNT(r.room_id) AS total_rooms,
    SUM(r.max_capacity) AS total_capacity,
    SUM(r.current_occupancy) AS total_occupied,
    SUM(r.max_capacity) - SUM(r.current_occupancy) AS total_available,
    COUNT(CASE WHEN r.current_occupancy < r.max_capacity THEN 1 END) AS available_rooms
FROM dorms d
INNER JOIN rooms r ON d.dorm_id = r.dorm_id
GROUP BY d.dorm_id, d.dorm_name, r.floor_number
ORDER BY d.dorm_name, r.floor_number;

-- Query 8: Get all dorms with room availability summary
-- Used by: Building selection, dorm listing API
SELECT 
    d.dorm_id,
    d.dorm_name,
    d.address,
    d.dorm_gender,
    d.dorm_type,
    COUNT(DISTINCT r.room_id) AS total_rooms,
    COUNT(DISTINCT CASE WHEN r.current_occupancy < r.max_capacity THEN r.room_id END) AS available_rooms,
    SUM(r.max_capacity) - SUM(r.current_occupancy) AS total_available_spots
FROM dorms d
LEFT JOIN rooms r ON d.dorm_id = r.dorm_id
GROUP BY d.dorm_id, d.dorm_name, d.address, d.dorm_gender, d.dorm_type
ORDER BY d.dorm_name;

-- Query 9: Get specific room with full details
-- Replace 1 with your room_id
SELECT 
    r.room_id,
    r.room_number,
    r.floor_number,
    r.room_type,
    r.max_capacity,
    r.current_occupancy,
    (r.max_capacity - r.current_occupancy) AS available_spots,
    r.dorm_id,
    r.wants_suite_bathroom,
    r.is_accessible,
    d.dorm_name,
    d.address,
    d.dorm_gender,
    d.dorm_type,
    -- Get assigned students (if any)
    COUNT(ra.student_id) AS assigned_students
FROM rooms r
INNER JOIN dorms d ON r.dorm_id = d.dorm_id
LEFT JOIN room_assignments ra ON r.room_id = ra.room_id AND ra.status = 'Confirmed'
WHERE r.room_id = 1  -- Replace with your room_id
GROUP BY r.room_id, r.room_number, r.floor_number, r.room_type, 
         r.max_capacity, r.current_occupancy, r.dorm_id,
         r.wants_suite_bathroom, r.is_accessible,
         d.dorm_name, d.address, d.dorm_gender, d.dorm_type;

-- Query 10: Find rooms that can accommodate a block of students
-- Replace 3 with the block size (number of students)
SELECT 
    r.room_id,
    r.room_number,
    r.floor_number,
    r.room_type,
    r.max_capacity,
    r.current_occupancy,
    (r.max_capacity - r.current_occupancy) AS available_spots,
    r.dorm_id,
    r.wants_suite_bathroom,
    r.is_accessible,
    d.dorm_name,
    d.dorm_gender
FROM rooms r
INNER JOIN dorms d ON r.dorm_id = d.dorm_id
WHERE r.current_occupancy < r.max_capacity
  AND (r.max_capacity - r.current_occupancy) >= 3  -- Replace with block size
ORDER BY 
    -- Prefer rooms that fit exactly
    ABS((r.max_capacity - r.current_occupancy) - 3),
    d.dorm_name,
    r.floor_number;

-- ============================================
-- 4. HELPER VIEWS FOR COMMON QUERIES
-- ============================================

-- View: Available rooms with dorm info (for easy querying)
CREATE OR REPLACE VIEW available_rooms_view AS
SELECT 
    r.room_id,
    r.room_number,
    r.floor_number,
    r.room_type,
    r.max_capacity,
    r.current_occupancy,
    (r.max_capacity - r.current_occupancy) AS available_spots,
    r.dorm_id,
    r.wants_suite_bathroom,
    r.is_accessible,
    d.dorm_name,
    d.address,
    d.dorm_gender,
    d.dorm_type
FROM rooms r
INNER JOIN dorms d ON r.dorm_id = d.dorm_id
WHERE r.current_occupancy < r.max_capacity;

-- View: Dorm statistics (for dashboards)
CREATE OR REPLACE VIEW dorm_statistics_view AS
SELECT 
    d.dorm_id,
    d.dorm_name,
    d.address,
    d.dorm_gender,
    d.dorm_type,
    COUNT(r.room_id) AS total_rooms,
    SUM(r.max_capacity) AS total_capacity,
    SUM(r.current_occupancy) AS total_occupied,
    SUM(r.max_capacity) - SUM(r.current_occupancy) AS total_available,
    COUNT(CASE WHEN r.current_occupancy < r.max_capacity THEN 1 END) AS available_rooms,
    ROUND(
        (SUM(r.current_occupancy)::DECIMAL / NULLIF(SUM(r.max_capacity), 0)) * 100, 
        2
    ) AS occupancy_percentage
FROM dorms d
LEFT JOIN rooms r ON d.dorm_id = r.dorm_id
GROUP BY d.dorm_id, d.dorm_name, d.address, d.dorm_gender, d.dorm_type;

-- ============================================
-- 5. USAGE EXAMPLES
-- ============================================

-- After creating the views, you can query them directly:
-- SELECT * FROM available_rooms_view;
-- SELECT * FROM dorm_statistics_view;

-- Or filter the views:
-- SELECT * FROM available_rooms_view WHERE dorm_id = 1;
-- SELECT * FROM available_rooms_view WHERE room_type = 'Double';
-- SELECT * FROM dorm_statistics_view WHERE dorm_gender = 'Co-ed';

