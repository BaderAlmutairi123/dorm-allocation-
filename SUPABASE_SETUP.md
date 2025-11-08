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
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Students table
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  year_level INTEGER NOT NULL,
  gpa DECIMAL(3,2),
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Preferences table
CREATE TABLE preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  sleep_schedule TEXT CHECK (sleep_schedule IN ('early', 'late', 'flexible')),
  study_habits TEXT CHECK (study_habits IN ('quiet', 'moderate', 'social')),
  cleanliness TEXT CHECK (cleanliness IN ('very_clean', 'clean', 'moderate', 'relaxed')),
  guest_policy TEXT CHECK (guest_policy IN ('never', 'rarely', 'sometimes', 'often')),
  interests TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blocks table
CREATE TABLE blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  leader_id UUID REFERENCES students(id) ON DELETE CASCADE,
  max_size INTEGER DEFAULT 8,
  current_size INTEGER DEFAULT 1,
  dorm_preferences TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Block members table
CREATE TABLE block_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  block_id UUID REFERENCES blocks(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(block_id, student_id)
);

-- Rooms table
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_name TEXT NOT NULL,
  room_number TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  room_type TEXT CHECK (room_type IN ('single', 'double', 'triple', 'suite')),
  floor INTEGER,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(building_name, room_number)
);

-- Assignments table
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  block_id UUID REFERENCES blocks(id) ON DELETE SET NULL,
  academic_year TEXT NOT NULL,
  semester TEXT CHECK (semester IN ('fall', 'spring')),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, academic_year, semester)
);

-- Compatibility scores table
CREATE TABLE compatibility_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_1_id UUID REFERENCES students(id) ON DELETE CASCADE,
  student_2_id UUID REFERENCES students(id) ON DELETE CASCADE,
  score DECIMAL(5,2) NOT NULL,
  breakdown JSONB,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_1_id, student_2_id)
);

-- Waitlist table
CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  priority TEXT CHECK (priority IN ('high', 'normal', 'low')) DEFAULT 'normal',
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id)
);

-- Create indexes for better performance
CREATE INDEX idx_students_email ON students(email);
CREATE INDEX idx_preferences_student_id ON preferences(student_id);
CREATE INDEX idx_blocks_leader_id ON blocks(leader_id);
CREATE INDEX idx_block_members_block_id ON block_members(block_id);
CREATE INDEX idx_block_members_student_id ON block_members(student_id);
CREATE INDEX idx_assignments_student_id ON assignments(student_id);
CREATE INDEX idx_assignments_room_id ON assignments(room_id);
CREATE INDEX idx_compatibility_student_1 ON compatibility_scores(student_1_id);
CREATE INDEX idx_compatibility_student_2 ON compatibility_scores(student_2_id);
CREATE INDEX idx_waitlist_position ON waitlist(position);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to update updated_at automatically
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_preferences_updated_at BEFORE UPDATE ON preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blocks_updated_at BEFORE UPDATE ON blocks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

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
