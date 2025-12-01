# Database Schema Requirements

This document outlines the required database tables and columns for the Dorm Allocation System to function correctly after removing the Building, Compatibility, and Admin pages.

## Required Tables

### 1. `students` Table
**Purpose:** Stores student profile information

**Required Columns:**
- `student_id` (or `student_uuid` or `id`) - **PRIMARY KEY** - UUID/string
- `email` - string, unique
- `first_name` - string
- `last_name` - string
- `gender` - string (e.g., "Male", "Female", "Other")
- `year_level` - integer (1=Freshman, 2=Sophomore, 3=Junior, 4=Senior)
- `major` - string, nullable
- `phone` - string, nullable
- `created_at` - timestamp
- `updated_at` - timestamp

**Notes:**
- The code is flexible and will try `student_uuid`, `student_id`, or `id` as the primary key
- `student_id` should match the Supabase Auth user ID (created during signup)

**SQL Example:**
```sql
CREATE TABLE students (
  student_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  gender TEXT,
  year_level INTEGER,
  major TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 2. `student_preferences` Table
**Purpose:** Stores student housing preferences for matching

**Required Columns:**
- `student_id` (or `student_uuid`) - **FOREIGN KEY** → `students.student_id`
- `preferred_room_type` - string, nullable (e.g., "Single", "Double", "Suite")
- `bedtime` - string, nullable (e.g., "Early Bird", "Night Owl")
- `noise_level` - integer, nullable (1-5 scale)
- `cleanliness_level` - integer, nullable (1-5 scale)
- `guest_policy_preference` - integer, nullable (0-4 days/week)
- `created_at` - timestamp
- `updated_at` - timestamp

**SQL Example:**
```sql
CREATE TABLE student_preferences (
  student_id UUID PRIMARY KEY REFERENCES students(student_id) ON DELETE CASCADE,
  preferred_room_type TEXT,
  bedtime TEXT,
  noise_level INTEGER CHECK (noise_level >= 1 AND noise_level <= 5),
  cleanliness_level INTEGER CHECK (cleanliness_level >= 1 AND cleanliness_level <= 5),
  guest_policy_preference INTEGER CHECK (guest_policy_preference >= 0 AND guest_policy_preference <= 4),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 3. `rooms` Table
**Purpose:** Stores dorm room information and availability

**Required Columns:**
- `id` (or `room_id`) - **PRIMARY KEY** - integer or UUID
- `dorm_id` - integer, nullable (references dorm building)
- `room_number` - string (e.g., "101", "2A")
- `floor_number` - integer, nullable
- `room_type` - string (e.g., "Single", "Double", "Suite")
- `max_capacity` - integer (maximum number of students)
- `current_occupancy` - integer, default 0 (current number of students)
- `wants_suite_bathroom` - boolean, nullable
- `is_accessible` - boolean, nullable
- `created_at` - timestamp
- `updated_at` - timestamp

**Notes:**
- `current_occupancy` must be ≤ `max_capacity`
- A room is available when `current_occupancy < max_capacity`
- The matching algorithm updates `current_occupancy` when assigning students

**SQL Example:**
```sql
CREATE TABLE rooms (
  id SERIAL PRIMARY KEY,
  dorm_id INTEGER,
  room_number TEXT NOT NULL,
  floor_number INTEGER,
  room_type TEXT NOT NULL,
  max_capacity INTEGER NOT NULL CHECK (max_capacity > 0),
  current_occupancy INTEGER DEFAULT 0 CHECK (current_occupancy >= 0 AND current_occupancy <= max_capacity),
  wants_suite_bathroom BOOLEAN,
  is_accessible BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 4. `room_assignments` Table
**Purpose:** Tracks room assignments for students

**Required Columns:**
- `assignment_id` (or `id`) - **PRIMARY KEY** - integer or UUID
- `student_id` (or `student_uuid`) - **FOREIGN KEY** → `students.student_id`
- `room_id` - integer, nullable - **FOREIGN KEY** → `rooms.id`
- `block_id` - integer, nullable (if student is part of a block)
- `status` - string, NOT NULL (values: "Pending", "Confirmed")
- `assignment_date` - date, nullable (date when room was assigned)

**Status Values:**
- `"Pending"` - Student has applied but not yet assigned
- `"Confirmed"` - Student has been assigned to a room

**SQL Example:**
```sql
CREATE TABLE room_assignments (
  assignment_id SERIAL PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
  block_id INTEGER,
  status TEXT NOT NULL CHECK (status IN ('Pending', 'Confirmed')),
  assignment_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id) -- One assignment per student
);
```

---

### 5. `blocks` or `student_blocks` Table (Optional)
**Purpose:** Stores student blocks (groups of students who want to room together)

**Required Columns:**
- `block_id` (or `id`) - **PRIMARY KEY** - integer or UUID
- `code` - string, unique (block invitation code)
- `created_at` - timestamp
- `updated_at` - timestamp

**Notes:**
- The code tries both `blocks` and `student_blocks` table names
- If this table doesn't exist, the matching algorithm will work but won't handle blocks

**SQL Example:**
```sql
CREATE TABLE student_blocks (
  block_id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 6. `block_members` Table (Optional)
**Purpose:** Links students to blocks

**Required Columns:**
- `id` - **PRIMARY KEY** - integer or UUID
- `block_id` - integer - **FOREIGN KEY** → `blocks.block_id` (or `student_blocks.block_id`)
- `student_id` (or `student_uuid`) - **FOREIGN KEY** → `students.student_id`

**SQL Example:**
```sql
CREATE TABLE block_members (
  id SERIAL PRIMARY KEY,
  block_id INTEGER NOT NULL REFERENCES student_blocks(block_id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(block_id, student_id) -- Prevent duplicate memberships
);
```

---

## Important Notes

### Field Name Flexibility
The codebase is designed to handle schema variations:
- **Student ID:** Tries `student_uuid`, `student_id`, or `id` in that order
- **Room ID:** Uses `id` or `room_id`
- **Block ID:** Uses `block_id` or `id`

### Required vs Optional Tables
- **Required:** `students`, `student_preferences`, `rooms`, `room_assignments`
- **Optional:** `blocks`/`student_blocks`, `block_members` (matching works without them)

### Status Values
- `room_assignments.status` must be exactly `"Pending"` or `"Confirmed"` (case-sensitive)
- Students with `status = 'Pending'` are matched by the algorithm
- Students with `status = 'Confirmed'` are already assigned

### Room Availability
- A room is available when `current_occupancy < max_capacity`
- The matching algorithm automatically updates `current_occupancy` when assigning students
- Always ensure `current_occupancy ≤ max_capacity`

---

## Database Setup Checklist

- [ ] Create `students` table with required columns
- [ ] Create `student_preferences` table with foreign key to `students`
- [ ] Create `rooms` table with capacity and occupancy tracking
- [ ] Create `room_assignments` table with status field
- [ ] (Optional) Create `student_blocks` or `blocks` table
- [ ] (Optional) Create `block_members` table
- [ ] Set up Row Level Security (RLS) policies in Supabase
- [ ] Ensure `SUPABASE_SERVICE_ROLE_KEY` is set for admin operations
- [ ] Verify foreign key constraints are in place
- [ ] Add indexes on frequently queried columns:
  - `students.student_id`
  - `room_assignments.student_id`
  - `room_assignments.status`
  - `room_assignments.room_id`
  - `rooms.id`

---

## Row Level Security (RLS) Policies

Since you're using Supabase, you'll need RLS policies. Here are recommended policies:

### Students Table
```sql
-- Students can read their own record
CREATE POLICY "Students can view own profile"
  ON students FOR SELECT
  USING (auth.uid() = student_id);

-- Students can update their own record
CREATE POLICY "Students can update own profile"
  ON students FOR UPDATE
  USING (auth.uid() = student_id);
```

### Student Preferences
```sql
-- Students can read their own preferences
CREATE POLICY "Students can view own preferences"
  ON student_preferences FOR SELECT
  USING (auth.uid() = student_id);

-- Students can insert/update their own preferences
CREATE POLICY "Students can manage own preferences"
  ON student_preferences FOR ALL
  USING (auth.uid() = student_id);
```

### Room Assignments
```sql
-- Students can read their own assignment
CREATE POLICY "Students can view own assignment"
  ON room_assignments FOR SELECT
  USING (auth.uid() = student_id);

-- Service role can manage all assignments (for matching algorithm)
-- This is handled via the service role key, not RLS
```

### Rooms
```sql
-- All authenticated users can read rooms (for viewing availability)
CREATE POLICY "Authenticated users can view rooms"
  ON rooms FOR SELECT
  TO authenticated
  USING (true);
```

---

## Environment Variables Required

Make sure these are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

The `SUPABASE_SERVICE_ROLE_KEY` is **critical** for the matching algorithm to work, as it bypasses RLS policies.

---

## Testing Your Database Setup

1. **Test Student Creation:**
   ```sql
   SELECT * FROM students LIMIT 5;
   ```

2. **Test Preferences:**
   ```sql
   SELECT * FROM student_preferences LIMIT 5;
   ```

3. **Test Room Assignments:**
   ```sql
   SELECT COUNT(*) FROM room_assignments WHERE status = 'Pending';
   ```

4. **Test Available Rooms:**
   ```sql
   SELECT COUNT(*) FROM rooms WHERE current_occupancy < max_capacity;
   ```

5. **Test Matching Algorithm:**
   - Ensure you have students with `status = 'Pending'` in `room_assignments`
   - Ensure you have rooms with `current_occupancy < max_capacity`
   - Call `POST /api/matching/run` to test the algorithm

---

## Common Issues and Solutions

### Issue: "Admin client not available"
**Solution:** Set `SUPABASE_SERVICE_ROLE_KEY` in your environment variables

### Issue: "Failed to fetch students"
**Solution:** Check that your `students` table has one of: `student_id`, `student_uuid`, or `id` as primary key

### Issue: "No pending students to match"
**Solution:** Ensure students have `room_assignments` records with `status = 'Pending'`

### Issue: "No available rooms"
**Solution:** Check that `rooms` table has rooms where `current_occupancy < max_capacity`

### Issue: RLS Policy Errors
**Solution:** Ensure service role key is set, or adjust RLS policies to allow necessary operations

