# Dorm Allocation Matching Algorithm

This directory contains the matching algorithm that assigns students to dorm rooms based on their preferences and compatibility.

## Overview

The matching algorithm:
1. **Calculates compatibility scores** between students based on:
   - Bedtime preferences (Early Bird vs Night Owl)
   - Noise level tolerance (1-5 scale)
   - Cleanliness preferences (1-5 scale)
   - Guest policy preferences (0-4 days/week)

2. **Matches students** considering:
   - Gender compatibility (same gender typically)
   - Room type preferences (Single, Double, Suite)
   - Room capacity and availability
   - Block assignments (groups of students who want to room together)

3. **Assigns rooms** based on:
   - Best compatibility matches
   - Room availability
   - Capacity constraints

## API Endpoints

### Run Matching Algorithm
```
POST /api/matching/run
```
Runs the matching algorithm and assigns students to rooms.

**Response:**
```json
{
  "success": true,
  "message": "Successfully matched 25 students",
  "matches": [
    {
      "student_id": "uuid",
      "room_id": "uuid",
      "block_id": null,
      "compatibility_score": 85,
      "matched_with": ["uuid2"]
    }
  ],
  "unmatched": [],
  "errors": []
}
```

### Get Matching Status
```
GET /api/matching/status
```
Returns current matching statistics.

**Response:**
```json
{
  "pendingStudents": 10,
  "assignedStudents": 25,
  "availableRooms": 15,
  "totalRooms": 50,
  "blocks": 3,
  "canRunMatching": true
}
```

### Calculate Compatibility
```
GET /api/matching/compatibility?student1=uuid1&student2=uuid2
```
Calculates compatibility score between two specific students.

**Response:**
```json
{
  "student1": {
    "id": "uuid1",
    "name": "John Doe"
  },
  "student2": {
    "id": "uuid2",
    "name": "Jane Smith"
  },
  "compatibility": {
    "student1_id": "uuid1",
    "student2_id": "uuid2",
    "score": 85,
    "breakdown": {
      "bedtime": 100,
      "noiseLevel": 80,
      "cleanliness": 90,
      "guestPolicy": 70
    }
  }
}
```

## Compatibility Scoring

The compatibility score is calculated as a weighted average:

- **Bedtime (25%)**: 100 if same preference, 30 if opposite (Early Bird + Night Owl)
- **Noise Level (25%)**: Based on difference (closer = higher score)
- **Cleanliness (25%)**: Based on difference (closer = higher score)
- **Guest Policy (25%)**: Based on difference (closer = higher score)

Final score ranges from 0-100, where:
- 80-100: Excellent match
- 60-79: Good match
- 40-59: Moderate match
- 0-39: Poor match

## Matching Process

1. **Fetch Data**: Gets all pending students, available rooms, current occupancy, and blocks
2. **Process Blocks**: Assigns entire blocks to rooms first (they must stay together)
3. **Group by Gender**: Separates students by gender for matching
4. **Calculate Compatibility**: Creates compatibility matrix for all student pairs
5. **Match Students**: Pairs students with highest compatibility scores
6. **Assign Rooms**: Assigns matched students to suitable rooms based on:
   - Room type preference
   - Room capacity
   - Current occupancy
7. **Update Database**: Updates `room_assignments` table with assignments

## Database Schema Requirements

The algorithm expects these tables:

- `students`: Student profiles with `student_id` (or `id`) as primary key
- `student_preferences`: Student preferences (bedtime, noise_level, etc.)
- `room_assignments`: Room assignment records with `status` field
- `rooms`: Available rooms with `capacity`, `room_type`, `is_available`
- `blocks` (optional): Student blocks/groups
- `block_members` (optional): Block membership

## Error Handling

The algorithm handles:
- Missing tables (blocks, block_members) gracefully
- Schema variations (student_id vs id)
- Missing preferences (uses neutral scores)
- Insufficient rooms (reports unmatched students)
- Database errors (continues with partial matches)

## Usage Example

```typescript
import { runMatchingAlgorithm } from '@/lib/matching/algorithm'

const result = await runMatchingAlgorithm()

if (result.success) {
  console.log(`Matched ${result.matches.length} students`)
  console.log(`Unmatched: ${result.unmatched.length}`)
} else {
  console.error('Errors:', result.errors)
}
```

## Testing

To test the matching algorithm:

1. Ensure you have students with pending assignments:
   ```sql
   SELECT * FROM room_assignments WHERE status = 'Pending';
   ```

2. Ensure you have available rooms:
   ```sql
   SELECT * FROM rooms WHERE is_available = true;
   ```

3. Run the matching:
   ```bash
   curl -X POST http://localhost:3000/api/matching/run
   ```

4. Check results:
   ```sql
   SELECT * FROM room_assignments WHERE status = 'Assigned';
   ```

## Notes

- The algorithm is idempotent - running it multiple times will only process pending students
- Students already assigned (status = 'Assigned') are not re-matched
- Blocks are prioritized and assigned together
- Room availability is updated automatically when rooms are full

