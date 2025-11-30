# Testing Guide for Dorm Allocation System

This guide covers comprehensive testing strategies for your dorm allocation application.

## Table of Contents
1. [Testing Setup](#testing-setup)
2. [Unit Tests](#unit-tests)
3. [Integration Tests](#integration-tests)
4. [End-to-End Tests](#end-to-end-tests)
5. [Algorithm Testing](#algorithm-testing)
6. [API Testing](#api-testing)
7. [Database Testing](#database-testing)
8. [Manual Testing Scenarios](#manual-testing-scenarios)

---

## Testing Setup

### 1. Install Testing Dependencies

```bash
npm install --save-dev \
  jest \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  jest-environment-jsdom \
  @types/jest \
  ts-jest \
  msw \
  @supabase/supabase-js
```

### 2. Configure Jest

Create `jest.config.js`:

```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
}

module.exports = createJestConfig(customJestConfig)
```

### 3. Create Jest Setup File

Create `jest.setup.js`:

```javascript
import '@testing-library/jest-dom'
```

### 4. Update package.json

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test"
  }
}
```

---

## Unit Tests

### 1. Matching Algorithm Tests

Create `src/lib/matching/__tests__/algorithm.test.ts`:

```typescript
import { calculateCompatibility } from '../algorithm'

describe('Matching Algorithm', () => {
  describe('calculateCompatibility', () => {
    it('should return perfect score for identical preferences', () => {
      const student1 = {
        student_id: '1',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@test.com',
        gender: 'Male',
        year_level: '1',
        major: null,
        preferences: {
          preferred_room_type: 'Double',
          bedtime: 'Early Bird',
          noise_level: 3,
          cleanliness_level: 4,
          guest_policy_preference: 2,
        },
      }

      const student2 = {
        student_id: '2',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@test.com',
        gender: 'Male',
        year_level: '1',
        major: null,
        preferences: {
          preferred_room_type: 'Double',
          bedtime: 'Early Bird',
          noise_level: 3,
          cleanliness_level: 4,
          guest_policy_preference: 2,
        },
      }

      const result = calculateCompatibility(student1, student2)
      
      expect(result.score).toBe(100)
      expect(result.breakdown.bedtime).toBe(100)
      expect(result.breakdown.noiseLevel).toBe(100)
      expect(result.breakdown.cleanliness).toBe(100)
      expect(result.breakdown.guestPolicy).toBe(100)
    })

    it('should return low score for opposite bedtime preferences', () => {
      const student1 = {
        student_id: '1',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@test.com',
        gender: 'Male',
        year_level: '1',
        major: null,
        preferences: {
          preferred_room_type: 'Double',
          bedtime: 'Early Bird',
          noise_level: 3,
          cleanliness_level: 4,
          guest_policy_preference: 2,
        },
      }

      const student2 = {
        student_id: '2',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@test.com',
        gender: 'Male',
        year_level: '1',
        major: null,
        preferences: {
          preferred_room_type: 'Double',
          bedtime: 'Night Owl',
          noise_level: 3,
          cleanliness_level: 4,
          guest_policy_preference: 2,
        },
      }

      const result = calculateCompatibility(student1, student2)
      
      expect(result.score).toBeLessThan(80)
      expect(result.breakdown.bedtime).toBe(30)
    })

    it('should handle missing preferences gracefully', () => {
      const student1 = {
        student_id: '1',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@test.com',
        gender: 'Male',
        year_level: '1',
        major: null,
        preferences: null,
      }

      const student2 = {
        student_id: '2',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@test.com',
        gender: 'Male',
        year_level: '1',
        major: null,
        preferences: {
          preferred_room_type: 'Double',
          bedtime: 'Early Bird',
          noise_level: 3,
          cleanliness_level: 4,
          guest_policy_preference: 2,
        },
      }

      const result = calculateCompatibility(student1, student2)
      
      expect(result.score).toBe(50) // Neutral score
    })

    it('should calculate noise level compatibility correctly', () => {
      const student1 = {
        student_id: '1',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@test.com',
        gender: 'Male',
        year_level: '1',
        major: null,
        preferences: {
          preferred_room_type: 'Double',
          bedtime: 'Early Bird',
          noise_level: 2,
          cleanliness_level: 4,
          guest_policy_preference: 2,
        },
      }

      const student2 = {
        student_id: '2',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@test.com',
        gender: 'Male',
        year_level: '1',
        major: null,
        preferences: {
          preferred_room_type: 'Double',
          bedtime: 'Early Bird',
          noise_level: 4, // Difference of 2
          cleanliness_level: 4,
          guest_policy_preference: 2,
        },
      }

      const result = calculateCompatibility(student1, student2)
      
      // Difference of 2 should give: 100 - (2 * 20) = 60
      expect(result.breakdown.noiseLevel).toBe(60)
    })
  })
})
```

### 2. Utility Function Tests

Create `src/lib/__tests__/utils.test.ts`:

```typescript
// Example: Test phone number cleaning
describe('Utils', () => {
  describe('cleanPhoneNumber', () => {
    it('should remove formatting from phone numbers', () => {
      const cleanPhone = phone.replace(/\D/g, '')
      expect(cleanPhone('(555) 123-4567')).toBe('5551234567')
      expect(cleanPhone('555-123-4567')).toBe('5551234567')
      expect(cleanPhone('5551234567')).toBe('5551234567')
    })
  })
})
```

---

## Integration Tests

### 1. API Route Tests

Create `src/app/api/application/__tests__/route.test.ts`:

```typescript
import { POST } from '../route'
import { createMocks } from 'node-mocks-http'
import { supabaseAdmin } from '@/lib/supabase/server'

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}))

describe('/api/application', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create student application successfully', async () => {
    const mockInsert = jest.fn().mockResolvedValue({
      data: [{ student_id: 'test-uuid', first_name: 'John' }],
      error: null,
    })

    const mockFrom = jest.fn().mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: mockInsert,
      }),
    })

    ;(supabaseAdmin.from as jest.Mock).mockImplementation(mockFrom)
    ;(supabaseAdmin.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'test-uuid' } },
      error: null,
    })

    const request = new Request('http://localhost/api/application', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token',
      },
      body: JSON.stringify({
        studentId: 'test-uuid',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
        phone: '555-123-4567',
        gender: 'Male',
        year: '1',
        major: 'Computer Science',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.message).toBe('Application submitted successfully')
  })

  it('should return 400 for missing required fields', async () => {
    const request = new Request('http://localhost/api/application', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'John',
        // Missing other required fields
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Missing required fields')
  })

  it('should return 401 for unauthenticated requests', async () => {
    ;(supabaseAdmin.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' },
    })

    const request = new Request('http://localhost/api/application', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid-token',
      },
      body: JSON.stringify({
        studentId: 'test-uuid',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
        phone: '555-123-4567',
        gender: 'Male',
        year: '1',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toContain('Unauthorized')
  })
})
```

### 2. Matching API Tests

Create `src/app/api/matching/run/__tests__/route.test.ts`:

```typescript
import { POST } from '../route'
import { runMatchingAlgorithm } from '@/lib/matching/algorithm'

jest.mock('@/lib/matching/algorithm')

describe('/api/matching/run', () => {
  it('should run matching algorithm successfully', async () => {
    const mockResult = {
      success: true,
      matches: [
        { student_id: '1', room_id: '101', compatibility_score: 85 },
      ],
      unmatched: [],
      errors: [],
    }

    ;(runMatchingAlgorithm as jest.Mock).mockResolvedValue(mockResult)

    const request = new Request('http://localhost/api/matching/run', {
      method: 'POST',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.matches).toHaveLength(1)
  })
})
```

---

## End-to-End Tests

### Setup Playwright

```bash
npm install --save-dev @playwright/test
npx playwright install
```

Create `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

### E2E Test Examples

Create `e2e/application-flow.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test.describe('Application Flow', () => {
  test('user can sign up and submit application', async ({ page }) => {
    // Navigate to sign up
    await page.goto('/sign-up')
    
    // Fill sign up form
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.fill('input[name="firstName"]', 'John')
    await page.fill('input[name="lastName"]', 'Doe')
    
    // Submit
    await page.click('button[type="submit"]')
    
    // Should redirect to application page
    await expect(page).toHaveURL('/application')
    
    // Fill application form
    await page.fill('input[name="phone"]', '555-123-4567')
    await page.selectOption('select[name="gender"]', 'Male')
    await page.selectOption('select[name="year"]', '1')
    
    // Submit application
    await page.click('button[type="submit"]')
    
    // Should show success message
    await expect(page.locator('text=Application submitted successfully')).toBeVisible()
  })

  test('user can view their room assignment', async ({ page }) => {
    // Login first
    await page.goto('/sign-in')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // Navigate to assignments
    await page.goto('/roommates')
    
    // Should see assignment details
    await expect(page.locator('text=Room Assignment')).toBeVisible()
  })
})
```

---

## Algorithm Testing

### Test Data Setup

Create `src/lib/matching/__tests__/test-data.ts`:

```typescript
export const mockStudents = [
  {
    student_id: '1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@test.com',
    gender: 'Male',
    year_level: '1',
    major: 'Computer Science',
    preferences: {
      preferred_room_type: 'Double',
      bedtime: 'Early Bird',
      noise_level: 2,
      cleanliness_level: 4,
      guest_policy_preference: 1,
    },
  },
  {
    student_id: '2',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane@test.com',
    gender: 'Male',
    year_level: '1',
    major: 'Engineering',
    preferences: {
      preferred_room_type: 'Double',
      bedtime: 'Early Bird',
      noise_level: 3,
      cleanliness_level: 4,
      guest_policy_preference: 2,
    },
  },
]

export const mockRooms = [
  {
    room_id: '101',
    dorm_id: 1,
    room_number: '101',
    floor_number: 1,
    room_type: 'Double',
    max_capacity: 2,
    current_occupancy: 0,
  },
  {
    room_id: '102',
    dorm_id: 1,
    room_number: '102',
    floor_number: 1,
    room_type: 'Double',
    max_capacity: 2,
    current_occupancy: 0,
  },
]
```

### Algorithm Integration Test

```typescript
import { runMatchingAlgorithm } from '../algorithm'
import { mockStudents, mockRooms } from './test-data'

describe('Matching Algorithm Integration', () => {
  it('should match students to rooms', async () => {
    // Mock Supabase responses
    jest.mock('@/lib/supabase/server', () => ({
      supabaseAdmin: {
        from: jest.fn((table) => {
          if (table === 'room_assignments') {
            return {
              select: jest.fn().mockResolvedValue({
                data: [{ student_id: '1', status: 'Pending' }],
                error: null,
              }),
            }
          }
          if (table === 'students') {
            return {
              select: jest.fn().mockResolvedValue({
                data: mockStudents,
                error: null,
              }),
            }
          }
          if (table === 'rooms') {
            return {
              select: jest.fn().mockResolvedValue({
                data: mockRooms,
                error: null,
              }),
            }
          }
        }),
      },
    }))

    const result = await runMatchingAlgorithm()

    expect(result.success).toBe(true)
    expect(result.matches.length).toBeGreaterThan(0)
    expect(result.errors).toHaveLength(0)
  })
})
```

---

## API Testing

### Using MSW (Mock Service Worker)

Create `src/__mocks__/handlers.ts`:

```typescript
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.post('/api/application', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      message: 'Application submitted successfully',
      student: { student_id: 'test-id', ...body },
    }, { status: 201 })
  }),

  http.get('/api/matching/status', () => {
    return HttpResponse.json({
      pendingStudents: 10,
      assignedStudents: 25,
      availableRooms: 15,
      totalRooms: 50,
    })
  }),
]
```

---

## Database Testing

### Test Database Setup

Create `src/__tests__/setup-db.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

// Use test database credentials
const supabaseTest = createClient(
  process.env.TEST_SUPABASE_URL!,
  process.env.TEST_SUPABASE_SERVICE_KEY!
)

export async function setupTestDatabase() {
  // Clear test data
  await supabaseTest.from('room_assignments').delete().neq('assignment_id', 0)
  await supabaseTest.from('student_preferences').delete().neq('preference_id', 0)
  await supabaseTest.from('students').delete().neq('student_id', '00000000-0000-0000-0000-000000000000')
  
  // Insert test data
  await supabaseTest.from('students').insert([
    {
      student_id: 'test-1',
      first_name: 'Test',
      last_name: 'Student',
      email: 'test1@example.com',
      gender: 'Male',
      year_level: '1',
    },
  ])
}

export async function teardownTestDatabase() {
  // Clean up after tests
  await supabaseTest.from('room_assignments').delete().neq('assignment_id', 0)
  await supabaseTest.from('student_preferences').delete().neq('preference_id', 0)
  await supabaseTest.from('students').delete().neq('student_id', '00000000-0000-0000-0000-000000000000')
}
```

---

## Manual Testing Scenarios

### 1. User Registration Flow
- [ ] Sign up with valid email and password
- [ ] Sign up with invalid email (should show error)
- [ ] Sign up with weak password (should show error)
- [ ] Sign up with existing email (should show error)

### 2. Application Submission
- [ ] Submit application with all required fields
- [ ] Submit application with missing fields (should show validation errors)
- [ ] Submit application with invalid phone number format
- [ ] Submit application while not authenticated (should redirect to sign-in)

### 3. Matching Algorithm
- [ ] Run matching with no pending students (should return appropriate message)
- [ ] Run matching with no available rooms (should return error)
- [ ] Run matching with blocks (should keep blocks together)
- [ ] Run matching with individual students (should match by compatibility)
- [ ] Verify room occupancy updates correctly after matching

### 4. Room Assignment Viewing
- [ ] View assignment when confirmed (should show room details)
- [ ] View assignment when pending (should show pending status)
- [ ] View assignment when not assigned (should show appropriate message)

### 5. Edge Cases
- [ ] Student with no preferences (should use neutral scores)
- [ ] Room capacity exceeded (should prevent assignment)
- [ ] Multiple students with same compatibility score (should handle tie-breaking)
- [ ] Database connection failure (should show error message)

---

## Test Coverage Goals

- **Unit Tests**: 80%+ coverage for business logic (matching algorithm, utilities)
- **Integration Tests**: All API endpoints tested
- **E2E Tests**: Critical user flows (sign up → application → assignment)
- **Manual Tests**: All features tested before release

---

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run specific test file
npm test algorithm.test.ts
```

---

## Continuous Integration

Add to `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run test:e2e
```

---

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Mock External Services**: Don't hit real Supabase in tests
3. **Test Data Management**: Use factories for test data
4. **Clear Test Names**: Describe what is being tested
5. **AAA Pattern**: Arrange, Act, Assert
6. **Test Edge Cases**: Don't just test happy paths
7. **Keep Tests Fast**: Unit tests should run in milliseconds
8. **Maintain Tests**: Update tests when code changes

