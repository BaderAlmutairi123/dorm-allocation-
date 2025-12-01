# Database Setup and Sample Data Guide

This guide helps you add sample data to your Supabase database and ensure everything is compatible with your code.

## Files Overview

1. **`SCHEMA_INSPECTION_AND_FIX.sql`** - Inspects your schema and fixes compatibility issues
2. **`ADD_SAMPLE_DATA_SAFE.sql`** - Safely adds sample data without deleting existing data
3. **`SAMPLE_DATA.sql`** - Comprehensive sample data (use with caution - may need adjustments)
4. **`RLS_POLICIES.sql`** - Row Level Security policies (already created)

## Step-by-Step Setup

### Step 1: Inspect Your Schema

1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `SCHEMA_INSPECTION_AND_FIX.sql`
3. Run the script
4. Review the output to see:
   - Your actual table structures
   - Existing constraints
   - Your existing student IDs

**What it does:**
- Shows your actual schema (columns, data types)
- Adds missing unique constraints (needed for upsert operations)
- Adds missing timestamp columns if needed
- Shows your existing students

### Step 2: Add Sample Data

1. In Supabase SQL Editor, open `ADD_SAMPLE_DATA_SAFE.sql`
2. Review the script - it's designed to be safe and won't delete existing data
3. Run the script

**What it does:**
- Adds preferences for students who don't have them
- Adds pending room assignments for students without assignments
- Adds more rooms (Single, Double, Suite types)
- Includes verification queries at the end

### Step 3: Verify Everything Works

After running the scripts, check:

1. **Students with Preferences:**
   ```sql
   SELECT COUNT(*) FROM student_preferences;
   ```

2. **Pending Assignments:**
   ```sql
   SELECT COUNT(*) FROM room_assignments WHERE status = 'Pending';
   ```

3. **Available Rooms:**
   ```sql
   SELECT COUNT(*) FROM rooms WHERE current_occupancy < max_capacity;
   ```

4. **Test Your Application:**
   - Try submitting an application
   - Check if the matching algorithm works
   - Verify room assignments are created

## Understanding Your Schema

Based on your database images, your schema includes:

### `students` Table
- `student_id` (UUID, Primary Key) - matches Supabase Auth user ID
- `email`, `first_name`, `last_name`
- `gender`, `year_level`, `major`, `phone`
- `created_at`, `updated_at`

### `student_preferences` Table
- `student_id` (UUID, Primary Key, Foreign Key → students)
- `preferred_room_type` (Single, Double, Suite)
- `bedtime` (Early Bird, Night Owl)
- `noise_level` (1-5)
- `cleanliness_level` (1-5)
- `guest_policy_preference` (0-4)

### `rooms` Table
- `id` (Integer, Primary Key)
- `dorm_id`, `room_number`, `floor_number`
- `room_type` (Single, Double, Suite)
- `max_capacity`, `current_occupancy`
- `wants_suite_bathroom`, `is_accessible`

### `room_assignments` Table
- `assignment_id` (Integer, Primary Key)
- `student_id` (UUID, Foreign Key → students, UNIQUE)
- `room_id` (Integer, Foreign Key → rooms, nullable)
- `block_id` (Integer, nullable)
- `status` (Pending, Confirmed)
- `assignment_date` (nullable)

### `student_blocks` Table
- `block_id` (Integer, Primary Key)
- `block_leader_id` (UUID, Foreign Key → students)
- `max_capacity` (Integer)
- `current_capacity` (Integer)

### `block_members` Table
- `members_id` (Integer, Primary Key) - Note: your schema uses `members_id` not `id`
- `block_id` (Integer, Foreign Key → student_blocks)
- `student_id` (UUID, Foreign Key → students)
- `joined_date` (Date)
- `is_leader` (Boolean)

## Common Issues and Solutions

### Issue: "No unique constraint matching ON CONFLICT"
**Solution:** Run `SCHEMA_INSPECTION_AND_FIX.sql` - it adds the missing unique constraint on `student_preferences.student_id`

### Issue: "Duplicate key value violates unique constraint"
**Solution:** The script uses `ON CONFLICT DO NOTHING` to avoid this. If you still get errors, check for existing records first.

### Issue: "Cannot insert student - no auth user"
**Solution:** Students must be created through your signup flow (which creates both auth user and student record). The sample data script only works with existing students.

### Issue: Sample data uses example.com emails
**Solution:** This is intentional - these are placeholder emails. In production, students are created via your signup API which creates real auth users.

## Adding Real Test Data

To add real test data with actual auth users:

1. **Create test auth users in Supabase:**
   - Go to Authentication → Users
   - Click "Add User"
   - Create users with test emails

2. **Get their user IDs:**
   ```sql
   SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 10;
   ```

3. **Insert student records:**
   ```sql
   INSERT INTO students (student_id, email, first_name, last_name, gender, year_level, major)
   VALUES 
     ('<user-id-from-auth>', 'test1@example.com', 'Test', 'User1', 'Male', 1, 'Computer Science');
   ```

4. **Add preferences and assignments:**
   - Use the same student_id in `student_preferences` and `room_assignments`

## Best Practices

1. **Always run inspection script first** - Understand your schema before making changes
2. **Use safe scripts** - `ADD_SAMPLE_DATA_SAFE.sql` won't delete existing data
3. **Test incrementally** - Add a few records, test, then add more
4. **Backup first** - Export your data before making bulk changes
5. **Check constraints** - Make sure foreign keys and unique constraints are correct

## Sharing Your Database Schema

If you need help with your specific schema, you can:

1. **Run the inspection script** and share the output
2. **Export table structures:**
   ```sql
   SELECT 
     table_name,
     column_name,
     data_type,
     is_nullable
   FROM information_schema.columns
   WHERE table_schema = 'public'
   ORDER BY table_name, ordinal_position;
   ```
3. **Share a screenshot** of your table structures (like you did before)

## Next Steps

After adding sample data:

1. ✅ Test application submission
2. ✅ Test the matching algorithm (`POST /api/matching/run`)
3. ✅ Test viewing assignments
4. ✅ Test block creation and management
5. ✅ Verify RLS policies are working correctly

## Questions?

If you encounter issues:
- Check the error message carefully
- Verify your schema matches what the code expects
- Run the inspection script to see your actual structure
- Share the error and schema output for help

