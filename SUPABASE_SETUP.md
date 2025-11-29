# Supabase Setup Guide

This guide will help you set up Supabase for the Dorm Allocation System.

## Quick Start

### 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in your project details:
   - Project Name: `dorm-allocation` (or your preferred name)
   - Database Password: Choose a strong password
   - Region: Select closest to your location
5. Wait for the project to finish setting up (1-2 minutes)

### 2. Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. You'll need these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`) - Keep this secret!

### 3. Configure Environment Variables

1. Open the `.env.local` file in the project root
2. Replace the placeholder values with your actual Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-role-key
JWT_SECRET=generate-a-random-string-here
```

**To generate a JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Set Up Database Schema

You need to create the database tables in Supabase. Go to **SQL Editor** in your Supabase dashboard and run this SQL:

```sql
-- Enable UUID generation for students table
--DO NOT RUN THIS QUERY, WILL NOT WORK 
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- 1) STUDENTS
-- ================================================
CREATE TABLE students (
    student_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    gender VARCHAR(50) CHECK (gender IN ('Male', 'Female', 'Other')) NOT NULL,
    year_level VARCHAR(50) NOT NULL,
    major VARCHAR(50),
    gpa DECIMAL(3,2)
);

-- ================================================
-- 2) DORMS
-- ================================================
CREATE TABLE dorms (
    dorm_id SERIAL PRIMARY KEY,
    dorm_name VARCHAR(255) NOT NULL,
    address VARCHAR(255),
    dorm_gender VARCHAR(50) CHECK (dorm_gender IN ('Male', 'Female', 'Co-ed')) NOT NULL,
    dorm_type VARCHAR(50) CHECK (dorm_type IN ('Single', 'Double', 'Suite')) NOT NULL
);

-- ================================================
-- 3) ROOMS (capacity 1–4)
-- ================================================
CREATE TABLE rooms (
    room_id SERIAL PRIMARY KEY,
    dorm_id INTEGER NOT NULL REFERENCES dorms(dorm_id),
    room_number VARCHAR(10) NOT NULL,
    floor_number INTEGER,
    room_type VARCHAR(20) NOT NULL,
    max_capacity INTEGER CHECK (max_capacity BETWEEN 1 AND 4) NOT NULL,
    current_occupancy INTEGER DEFAULT 0,
    wants_suite_bathroom BOOLEAN DEFAULT FALSE,
    is_accessible BOOLEAN DEFAULT FALSE,
    CHECK (current_occupancy BETWEEN 0 AND max_capacity)
);

-- ================================================
-- 4) STUDENT BLOCKS (capacity 2–4)
-- ================================================
CREATE TABLE student_blocks (
    block_id SERIAL PRIMARY KEY,
    block_leader_id UUID NOT NULL REFERENCES students(student_id),
    max_capacity INTEGER CHECK (max_capacity BETWEEN 2 AND 4) NOT NULL,
    current_capacity INTEGER DEFAULT 0,
    CHECK (current_capacity BETWEEN 0 AND max_capacity)
);

-- ================================================
-- 5) BLOCK MEMBERS
-- ================================================
CREATE TABLE block_members (
    membership_id SERIAL PRIMARY KEY,
    block_id INTEGER NOT NULL REFERENCES student_blocks(block_id),
    student_id UUID NOT NULL REFERENCES students(student_id),
    joined_date DATE DEFAULT CURRENT_DATE,
    is_leader BOOLEAN DEFAULT FALSE,
    UNIQUE (block_id, student_id)
);

-- ================================================
-- 6) STUDENT PREFERENCES
-- ================================================
CREATE TABLE student_preferences (
    preference_id SERIAL PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(student_id),
    preferred_room_type VARCHAR(20),
    first_choice_dorm_id INTEGER REFERENCES dorms(dorm_id),
    second_choice_dorm_id INTEGER REFERENCES dorms(dorm_id),
    third_choice_dorm_id INTEGER REFERENCES dorms(dorm_id),
    bedtime VARCHAR(20) CHECK (bedtime IN ('Night Owl', 'Early Bird')),
    noise_level INTEGER CHECK (noise_level BETWEEN 1 AND 5),
    cleanliness_level INTEGER CHECK (cleanliness_level BETWEEN 1 AND 5),
    guest_policy_preference INTEGER CHECK (guest_policy_preference BETWEEN 0 AND 4)
);

-- ================================================
-- 7) ROOM ASSIGNMENTS
-- ================================================
CREATE TABLE room_assignments (
    assignment_id SERIAL PRIMARY KEY,
    student_id UUID REFERENCES students(student_id),
    block_id INTEGER REFERENCES student_blocks(block_id),
    room_id INTEGER REFERENCES rooms(room_id), -- allow NULL until assigned
    assignment_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed')),
    CHECK (
        (student_id IS NOT NULL AND block_id IS NULL)
        OR (student_id IS NULL AND block_id IS NOT NULL)
    ),
    CHECK (
        (status = 'Pending' AND room_id IS NULL)
        OR (status = 'Confirmed' AND room_id IS NOT NULL)
    )
);



### 5. Enable Row Level Security (Optional but Recommended)

For production, you should enable Row Level Security (RLS) on your tables:

```sql
-- Enable RLS on all tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE block_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE compatibility_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Example policy: Students can only read/update their own data
CREATE POLICY "Students can view own profile"
  ON students FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Students can update own profile"
  ON students FOR UPDATE
  USING (auth.uid() = id);

-- Add more policies as needed for your security requirements
```

## File Structure

The Supabase integration includes these files:

```
src/lib/supabase/
├── client.ts          # Client-side Supabase instance (for React components)
├── server.ts          # Server-side Supabase instance (for API routes)
├── auth.ts            # Authentication helper functions
├── types.ts           # TypeScript types for database tables
└── index.ts           # Barrel export file

src/app/api/auth/
├── signin/route.ts    # Sign in API endpoint
├── signup/route.ts    # Sign up API endpoint
└── logout/route.ts    # Logout API endpoint
```

## Usage Examples

### Client-Side (React Components)

```typescript
'use client'

import { supabase } from '@/lib/supabase/client'
import { authClient } from '@/lib/supabase/auth'

// Sign up
const handleSignUp = async () => {
  await authClient.signUp('email@example.com', 'password', {
    first_name: 'John',
    last_name: 'Doe',
    year_level: 1
  })
}

// Sign in
const handleSignIn = async () => {
  await authClient.signIn('email@example.com', 'password')
}

// Get current user
const user = await authClient.getUser()

// Query data
const { data, error } = await supabase
  .from('students')
  .select('*')
  .eq('id', userId)
```

### Server-Side (API Routes)

```typescript
import { supabaseServer } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { data, error } = await supabaseServer
    .from('students')
    .select('*')

  return Response.json({ data, error })
}
```

## Testing the Connection

1. Start your development server:
   ```bash
   npm run dev
   ```

2. The app should start without errors. Check the console for any Supabase connection issues.

3. Try signing up a test user through your sign-in page.

## Troubleshooting

### "Missing Supabase environment variables" error
- Make sure `.env.local` exists and has the correct values
- Restart your dev server after adding environment variables

### "relation does not exist" error
- You haven't created the database tables yet
- Run the SQL schema in the Supabase SQL Editor

### Authentication not working
- Check that your Supabase URL and keys are correct
- Make sure email confirmations are disabled (Settings → Authentication → Email Auth → Confirm Email = OFF) for development

### CORS errors
- Supabase allows all origins by default for the anon key
- If you're having issues, check Authentication → URL Configuration in Supabase settings

## Next Steps

1. ✅ Supabase project created
2. ✅ Environment variables configured
3. ✅ Database schema created
4. ✅ Authentication endpoints set up
5. 🔄 Test the authentication flow
6. 🔄 Build out the rest of your application features

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Next.js + Supabase Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
