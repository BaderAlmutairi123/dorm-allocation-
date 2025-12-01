-- =====================================================
-- Add More Rooms to Database
-- =====================================================
-- This script adds additional rooms to ensure there are
-- enough rooms for matching students, including blocks
-- =====================================================

-- Fix sequence for rooms if it's out of sync
-- Primary key column is 'room.id' (with dot, needs to be quoted)
DO $$
DECLARE
  max_id INTEGER;
  seq_name TEXT;
BEGIN
  EXECUTE 'SELECT COALESCE(MAX("room.id"), 0) FROM rooms' INTO max_id;
  seq_name := pg_get_serial_sequence('rooms', 'room.id');
  IF seq_name IS NOT NULL AND max_id > 0 THEN
    -- Set sequence to max_id with is_called=true (next value will be max_id + 1)
    PERFORM setval(seq_name, max_id, true);
  END IF;
END $$;

-- First, let's check how many dorms we have
-- Assuming we have at least 5 dorms (from the image showing dorm_id 1-5)

-- Add rooms for Dorm 1 (if it exists)
-- Using WHERE NOT EXISTS to avoid duplicate room_number per dorm
INSERT INTO rooms (dorm_id, room_number, floor_number, room_type, max_capacity, current_occupancy, wants_suite_bathroom, is_accessible)
SELECT * FROM (VALUES
  (1, '108', 1, 'Double', 2, 0, FALSE, FALSE),
  (1, '109', 1, 'Double', 2, 0, FALSE, FALSE),
  (1, '110', 1, 'Double', 2, 0, FALSE, FALSE),
  (1, '202', 2, 'Double', 2, 0, FALSE, FALSE),
  (1, '203', 2, 'Double', 2, 0, FALSE, FALSE),
  (1, '204', 2, 'Double', 2, 0, FALSE, FALSE),
  (1, '303', 3, 'Double', 2, 0, FALSE, FALSE),
  (1, '304', 3, 'Double', 2, 0, FALSE, FALSE),
  (1, '404', 4, 'Double', 2, 0, FALSE, FALSE),
  (1, '405', 4, 'Double', 2, 0, FALSE, FALSE),
  (1, '501', 5, 'Suite', 4, 0, TRUE, FALSE),
  (1, '502', 5, 'Suite', 4, 0, TRUE, FALSE),
  (1, '503', 5, 'Suite', 4, 0, TRUE, FALSE)
) AS v(dorm_id, room_number, floor_number, room_type, max_capacity, current_occupancy, wants_suite_bathroom, is_accessible)
WHERE EXISTS (SELECT 1 FROM dorms WHERE dorm_id = 1)
  AND NOT EXISTS (SELECT 1 FROM rooms WHERE rooms.dorm_id = v.dorm_id AND rooms.room_number = v.room_number);

-- Add rooms for Dorm 2
INSERT INTO rooms (dorm_id, room_number, floor_number, room_type, max_capacity, current_occupancy, wants_suite_bathroom, is_accessible)
SELECT * FROM (VALUES
  (2, '108', 1, 'Double', 2, 0, FALSE, FALSE),
  (2, '109', 1, 'Double', 2, 0, FALSE, FALSE),
  (2, '110', 1, 'Double', 2, 0, FALSE, FALSE),
  (2, '206', 2, 'Double', 2, 0, FALSE, FALSE),
  (2, '207', 2, 'Double', 2, 0, FALSE, FALSE),
  (2, '208', 2, 'Double', 2, 0, FALSE, FALSE),
  (2, '303', 3, 'Double', 2, 0, FALSE, FALSE),
  (2, '304', 3, 'Double', 2, 0, FALSE, FALSE),
  (2, '404', 4, 'Double', 2, 0, FALSE, FALSE),
  (2, '405', 4, 'Double', 2, 0, FALSE, FALSE),
  (2, '501', 5, 'Suite', 4, 0, TRUE, FALSE),
  (2, '502', 5, 'Suite', 4, 0, TRUE, FALSE)
) AS v(dorm_id, room_number, floor_number, room_type, max_capacity, current_occupancy, wants_suite_bathroom, is_accessible)
WHERE EXISTS (SELECT 1 FROM dorms WHERE dorm_id = 2)
  AND NOT EXISTS (SELECT 1 FROM rooms WHERE rooms.dorm_id = v.dorm_id AND rooms.room_number = v.room_number);

-- Add rooms for Dorm 3
INSERT INTO rooms (dorm_id, room_number, floor_number, room_type, max_capacity, current_occupancy, wants_suite_bathroom, is_accessible)
SELECT * FROM (VALUES
  (3, '108', 1, 'Double', 2, 0, FALSE, FALSE),
  (3, '109', 1, 'Double', 2, 0, FALSE, FALSE),
  (3, '110', 1, 'Double', 2, 0, FALSE, FALSE),
  (3, '206', 2, 'Double', 2, 0, FALSE, FALSE),
  (3, '207', 2, 'Double', 2, 0, FALSE, FALSE),
  (3, '303', 3, 'Double', 2, 0, FALSE, FALSE),
  (3, '304', 3, 'Double', 2, 0, FALSE, FALSE),
  (3, '404', 4, 'Double', 2, 0, FALSE, FALSE),
  (3, '501', 5, 'Suite', 4, 0, TRUE, FALSE),
  (3, '502', 5, 'Suite', 4, 0, TRUE, FALSE)
) AS v(dorm_id, room_number, floor_number, room_type, max_capacity, current_occupancy, wants_suite_bathroom, is_accessible)
WHERE EXISTS (SELECT 1 FROM dorms WHERE dorm_id = 3)
  AND NOT EXISTS (SELECT 1 FROM rooms WHERE rooms.dorm_id = v.dorm_id AND rooms.room_number = v.room_number);

-- Add rooms for Dorm 4
INSERT INTO rooms (dorm_id, room_number, floor_number, room_type, max_capacity, current_occupancy, wants_suite_bathroom, is_accessible)
SELECT * FROM (VALUES
  (4, '108', 1, 'Double', 2, 0, FALSE, FALSE),
  (4, '109', 1, 'Double', 2, 0, FALSE, FALSE),
  (4, '206', 2, 'Double', 2, 0, FALSE, FALSE),
  (4, '207', 2, 'Double', 2, 0, FALSE, FALSE),
  (4, '303', 3, 'Double', 2, 0, FALSE, FALSE),
  (4, '404', 4, 'Double', 2, 0, FALSE, FALSE),
  (4, '501', 5, 'Suite', 4, 0, TRUE, FALSE)
) AS v(dorm_id, room_number, floor_number, room_type, max_capacity, current_occupancy, wants_suite_bathroom, is_accessible)
WHERE EXISTS (SELECT 1 FROM dorms WHERE dorm_id = 4)
  AND NOT EXISTS (SELECT 1 FROM rooms WHERE rooms.dorm_id = v.dorm_id AND rooms.room_number = v.room_number);

-- Add rooms for Dorm 5
INSERT INTO rooms (dorm_id, room_number, floor_number, room_type, max_capacity, current_occupancy, wants_suite_bathroom, is_accessible)
SELECT * FROM (VALUES
  (5, '108', 1, 'Double', 2, 0, FALSE, FALSE),
  (5, '109', 1, 'Double', 2, 0, FALSE, FALSE),
  (5, '206', 2, 'Double', 2, 0, FALSE, FALSE),
  (5, '303', 3, 'Double', 2, 0, FALSE, FALSE),
  (5, '501', 5, 'Suite', 4, 0, TRUE, FALSE)
) AS v(dorm_id, room_number, floor_number, room_type, max_capacity, current_occupancy, wants_suite_bathroom, is_accessible)
WHERE EXISTS (SELECT 1 FROM dorms WHERE dorm_id = 5)
  AND NOT EXISTS (SELECT 1 FROM rooms WHERE rooms.dorm_id = v.dorm_id AND rooms.room_number = v.room_number);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Count total rooms
SELECT COUNT(*) as total_rooms FROM rooms;

-- Count available rooms (current_occupancy < max_capacity)
SELECT COUNT(*) as available_rooms 
FROM rooms 
WHERE current_occupancy < max_capacity;

-- Count rooms by type
SELECT room_type, COUNT(*) as count, SUM(max_capacity - current_occupancy) as available_spots
FROM rooms
GROUP BY room_type
ORDER BY room_type;

-- Count rooms by dorm
SELECT dorm_id, COUNT(*) as room_count, SUM(max_capacity - current_occupancy) as available_spots
FROM rooms
GROUP BY dorm_id
ORDER BY dorm_id;

-- Show rooms with capacity for blocks (4+ capacity)
SELECT "room.id", dorm_id, room_number, room_type, max_capacity, current_occupancy, 
       (max_capacity - current_occupancy) as available_spots
FROM rooms
WHERE max_capacity >= 4
ORDER BY dorm_id, room_number;

