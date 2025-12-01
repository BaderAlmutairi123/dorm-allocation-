# Database Schema Fixes Needed

Based on your actual database tables, here are the specific issues and fixes required:

## ✅ What's Working Correctly

1. **`students` table**: Structure looks good
   - ✅ `student_id` (uuid) as primary key
   - ✅ All required columns present

2. **`student_preferences` table**: Structure looks good
   - ✅ `student_id` (uuid) foreign key
   - ✅ All preference columns present

3. **`room_assignments` table**: Structure looks good
   - ✅ `student_id` (uuid) foreign key
   - ✅ `room_id` (integer) foreign key
   - ✅ `status` column with "Confirmed" values
   - ✅ `block_id` (nullable integer)
   - ✅ `assignment_date` column

## ⚠️ Issues That Need Fixing

### 1. **`students.year_level` - Data Type Mismatch**

**Problem:**
- Your table has `year_level` as `varchar` with mixed values: "Junior", "Sophomore", "Freshman", "Senior", "1", "2", "3"
- The code expects to save **integers** (1, 2, 3, 4) when processing applications
- The matching algorithm reads it as a string, which is fine, but inconsistency can cause issues

**Solution Options:**

**Option A: Keep as VARCHAR (Easier - No Migration)**
- The code will work, but you need to ensure new records use integer strings ("1", "2", "3", "4")
- Update existing records to use integer strings:

```sql
-- Update existing string values to integers
UPDATE students 
SET year_level = CASE 
  WHEN year_level = 'Freshman' THEN '1'
  WHEN year_level = 'Sophomore' THEN '2'
  WHEN year_level = 'Junior' THEN '3'
  WHEN year_level = 'Senior' THEN '4'
  ELSE year_level
END
WHERE year_level IN ('Freshman', 'Sophomore', 'Junior', 'Senior');
```

**Option B: Change to INTEGER (Better - Requires Migration)**
- Change column type to integer
- Convert existing values:

```sql
-- Add a temporary column
ALTER TABLE students ADD COLUMN year_level_temp INTEGER;

-- Convert values
UPDATE students 
SET year_level_temp = CASE 
  WHEN year_level = 'Freshman' OR year_level = '1' THEN 1
  WHEN year_level = 'Sophomore' OR year_level = '2' THEN 2
  WHEN year_level = 'Junior' OR year_level = '3' THEN 3
  WHEN year_level = 'Senior' OR year_level = '4' THEN 4
  ELSE 1
END;

-- Drop old column and rename
ALTER TABLE students DROP COLUMN year_level;
ALTER TABLE students RENAME COLUMN year_level_temp TO year_level;
```

**Recommendation:** Option A is safer and easier. The code handles both string and integer values.

---

### 2. **`rooms` Table - Missing Primary Key**

**Problem:**
- The code expects `rooms.id` to exist (see line 294 in algorithm.ts: `id: String(room.id)`)
- Your table image doesn't show an `id` column
- The `room_assignments` table references `room_id` (integer), so rooms need a primary key

**Solution:**

```sql
-- Check if id column exists (it might just be hidden in the UI)
-- If it doesn't exist, add it:

-- Option 1: If rooms table has no primary key yet
ALTER TABLE rooms ADD COLUMN id SERIAL PRIMARY KEY;

-- Option 2: If you want to use an existing column as primary key
-- First, check what unique identifier you have
-- Then set it as primary key:
ALTER TABLE rooms ADD PRIMARY KEY (id); -- if id already exists
```

**Verify:**
```sql
-- Check if id column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'rooms' AND column_name = 'id';

-- If it doesn't exist, create it
ALTER TABLE rooms ADD COLUMN id SERIAL PRIMARY KEY;
```

---

### 3. **`rooms` Table - Missing `dorm_id` Column (Optional but Recommended)**

**Problem:**
- The code references `room.dorm_id` (line 295 in algorithm.ts)
- If missing, rooms will show as "Unknown" building
- This is **optional** - the code handles missing `dorm_id` gracefully

**Solution (Optional):**

```sql
-- Add dorm_id column if it doesn't exist
ALTER TABLE rooms ADD COLUMN dorm_id INTEGER;

-- If you have a dorms/buildings table, add foreign key:
-- ALTER TABLE rooms ADD CONSTRAINT fk_dorm 
--   FOREIGN KEY (dorm_id) REFERENCES dorms(dorm_id);
```

---

### 4. **`room_assignments` Table - Verify Primary Key**

**Problem:**
- The table image doesn't show a primary key column
- The code doesn't strictly require it, but it's best practice

**Solution:**

```sql
-- Check if primary key exists
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'room_assignments' AND constraint_type = 'PRIMARY KEY';

-- If no primary key, add one:
ALTER TABLE room_assignments ADD COLUMN assignment_id SERIAL PRIMARY KEY;

-- Or if you want to use a composite key:
-- ALTER TABLE room_assignments ADD PRIMARY KEY (student_id);
```

**Note:** Since `student_id` should be unique (one assignment per student), you could use it as primary key, or add a separate `assignment_id`.

---

## 🔍 Verification Queries

Run these to check your current schema:

```sql
-- 1. Check students table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'students'
ORDER BY ordinal_position;

-- 2. Check year_level values
SELECT DISTINCT year_level, COUNT(*) 
FROM students 
GROUP BY year_level;

-- 3. Check rooms table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'rooms'
ORDER BY ordinal_position;

-- 4. Check if rooms has primary key
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'rooms' AND constraint_type = 'PRIMARY KEY';

-- 5. Check room_assignments structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'room_assignments'
ORDER BY ordinal_position;

-- 6. Check foreign key constraints
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('students', 'student_preferences', 'room_assignments', 'rooms');
```

---

## ✅ Quick Fix Checklist

- [ ] **Fix year_level**: Update existing string values to integer strings ("1", "2", "3", "4")
- [ ] **Add rooms.id**: Ensure `rooms` table has an `id` SERIAL PRIMARY KEY column
- [ ] **Add rooms.dorm_id** (optional): Add if you want building information
- [ ] **Verify room_assignments primary key**: Ensure it has a primary key
- [ ] **Test foreign keys**: Verify all foreign key relationships are set up
- [ ] **Test matching algorithm**: Run with test data to ensure everything works

---

## 🧪 Test After Fixes

```sql
-- 1. Test pending students query
SELECT COUNT(*) FROM room_assignments WHERE status = 'Pending';

-- 2. Test available rooms query
SELECT COUNT(*) FROM rooms WHERE current_occupancy < max_capacity;

-- 3. Test room assignment update
-- This should work if rooms.id exists:
SELECT r.id, r.room_number, r.max_capacity, r.current_occupancy
FROM rooms r
WHERE r.current_occupancy < r.max_capacity
LIMIT 5;

-- 4. Test student with preferences
SELECT s.student_id, s.first_name, sp.preferred_room_type
FROM students s
LEFT JOIN student_preferences sp ON s.student_id = sp.student_id
LIMIT 5;
```

---

## 📝 Summary

**Critical Fixes:**
1. ✅ Ensure `rooms.id` exists (primary key) - **REQUIRED**
2. ✅ Standardize `year_level` values - **RECOMMENDED**

**Optional Fixes:**
3. Add `rooms.dorm_id` if you want building information
4. Add `room_assignments.assignment_id` primary key (if missing)

**Your tables are mostly correct!** The main issue is ensuring `rooms.id` exists, and optionally standardizing `year_level` values.

