# Dorm Allocation System

A full-stack web application designed to streamline university dormitory allocation through intelligent roommate matching and block management.

## Project Overview

The Dorm Allocation System is a comprehensive web application that helps university students find compatible roommates and manage housing assignments efficiently. The system uses a sophisticated matching algorithm that considers student preferences, living habits, and compatibility factors to create optimal roommate pairings.

**Project Timeline:** September 30, 2025 - December 2, 2025 (9 weeks)

## Technology Stack

### Frontend
- **React.js** - Component-based UI framework
- **Single-Page Application (SPA)** architecture
- Responsive design optimized for desktop and mobile

### Backend
- **Node.js** with **Express.js** framework
- **RESTful API** endpoints for client-server communication
- JWT-based authentication system
- Business logic for matching algorithm and data processing

### Database
- **Supabase** (PostgreSQL-based backend-as-a-service)
- Real-time database capabilities
- Built-in authentication support
- RESTful API for database operations
- Secure data storage for:
  - Student profiles and preferences
  - Roommate blocks (3-8 students)
  - Dorm room assignments
  - Compatibility scores
  - Waitlist management

### Version Control & CI/CD
- **Git** with **GitHub** repository
- **GitHub Actions** for continuous integration
- Automated testing and build verification

## Key Features

### For Students
- **Profile Creation**: Comprehensive student profiles including:
  - Sleep schedules (early/late sleeper)
  - Study habits and preferences
  - Cleanliness levels
  - Guest policies
  - Personal interests
  - Contact information

- **Block System**: 
  - Create or join roommate blocks (3-8 students)
  - Block leader management
  - Invitation system for block members
  - Block preferences for dorm halls

- **Compatibility Matching**:
  - Algorithm-based roommate matching
  - Compatibility scores and comparisons
  - Filter and search potential roommates
  - View detailed compatibility breakdowns

- **Room Assignments**:
  - View assigned dorm room and building
  - See roommate information (names and contact info)
  - Receive notifications for assignment updates

### For Housing Staff (Admins)
- Run matching algorithm on demand
- View real-time room availability
- Manage waitlist for housing
- Publish housing assignments to students
- Handle room changes and updates
- Access comprehensive rosters and analytics

## Architecture

The system follows a modern three-tier architecture:

```
┌─────────────────────────────────────────┐
│         Frontend (React.js)             │
│   - User Interface Components           │
│   - State Management                    │
│   - Client-side Routing                 │
└──────────────┬──────────────────────────┘
               │
               │ RESTful API (HTTPS)
               │
┌──────────────▼──────────────────────────┐
│    Backend (Node.js + Express)          │
│   - RESTful API Endpoints               │
│   - Authentication & Authorization      │
│   - Matching Algorithm Logic            │
│   - Data Validation & Processing        │
└──────────────┬──────────────────────────┘
               │
               │ Supabase REST API
               │
┌──────────────▼──────────────────────────┐
│    Database (Supabase/PostgreSQL)       │
│   - Student Profiles                    │
│   - Blocks & Room Assignments           │
│   - Preference Data                     │
│   - Compatibility Scores                │
└─────────────────────────────────────────┘
```

## Database Schema (Supabase/PostgreSQL)

### Key Tables
- **students**: Student profiles, IDs, year levels, GPA, contact info
- **preferences**: Survey answers, sleep schedules, study habits, guest policies
- **blocks**: Roommate blocks with leaders and members (3-8 per block)
- **rooms**: Dorm rooms with capacities, types (single/double/suite), and availability
- **assignments**: Final room assignments linking students to rooms
- **compatibility_scores**: Cached compatibility calculations
- **waitlist**: Students awaiting room assignment

## RESTful API Endpoints

### Authentication
- `POST /api/auth/register` - Student registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify` - Token verification

### Student Profiles
- `GET /api/students/:id` - Get student profile
- `PUT /api/students/:id` - Update student profile
- `POST /api/students/:id/preferences` - Submit preference survey

### Blocks
- `POST /api/blocks` - Create new block
- `GET /api/blocks/:id` - Get block details
- `POST /api/blocks/:id/invite` - Invite student to block
- `PUT /api/blocks/:id/accept` - Accept block invitation
- `DELETE /api/blocks/:id/leave` - Leave block

### Matching & Assignments
- `POST /api/matching/run` - Run matching algorithm (admin only)
- `GET /api/assignments/:studentId` - Get student's room assignment
- `GET /api/compatibility/:studentId/:targetId` - Calculate compatibility score

### Rooms & Buildings
- `GET /api/rooms` - List available rooms
- `GET /api/rooms/:id` - Get room details
- `GET /api/buildings` - List dorm buildings

## Matching Algorithm

The core matching algorithm considers multiple factors:

1. **Block Integrity**: Never splits pre-formed blocks
2. **Compatibility Scoring**: Weighted scoring based on:
   - Sleep schedule alignment (25%)
   - Study habit compatibility (20%)
   - Cleanliness preferences (20%)
   - Guest policy agreement (15%)
   - Shared interests (20%)
3. **Room Capacity**: Prevents overfilling
4. **Year Level Restrictions**: Respects freshman-only dorms
5. **Waitlist Management**: Automatically fills vacant spots

## Project Structure

```
dorm-allocation/
├── frontend/               # React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page-level components
│   │   ├── services/      # API service layer
│   │   ├── utils/         # Helper functions
│   │   └── App.js         # Root component
│   └── package.json
│
├── backend/               # Node.js/Express API
│   ├── src/
│   │   ├── controllers/   # Request handlers
│   │   ├── models/        # Data models
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Auth & validation
│   │   ├── services/      # Business logic
│   │   │   └── matchingAlgorithm.js
│   │   └── config/
│   │       └── supabase.js  # Supabase client config
│   └── package.json
│
├── docs/                  # Documentation
├── tests/                 # Test suites
└── README.md
```

## Development Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Supabase account and project
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/dorm-allocation.git
   cd dorm-allocation
   ```

2. **Set up Supabase**
   - Create a new project in Supabase
   - Copy your project URL and anon key
   - Create tables using the provided schema in `/docs/database-schema.sql`

3. **Configure environment variables**
   
   Backend `.env`:
   ```
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   JWT_SECRET=your_jwt_secret
   PORT=5000
   ```
   
   Frontend `.env`:
   ```
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_SUPABASE_URL=your_supabase_project_url
   REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Install dependencies**
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

5. **Run development servers**
   ```bash
   # Backend (from backend directory)
   npm run dev
   
   # Frontend (from frontend directory)
   npm start
   ```

## Testing

```bash
# Run backend tests
cd backend
npm test

# Run frontend tests
cd frontend
npm test

# Run integration tests
npm run test:integration
```

## Deployment

### Staging
- Automatic deployment to staging environment on push to `develop` branch
- Uses GitHub Actions for CI/CD

### Production
- Manual deployment after testing validation
- Deploy to production from `main` branch
- Requires approval from project manager

## Version Control Strategy

### Branching Model
- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - Feature development branches (e.g., `feature/matching-algorithm`)

### Commit Convention
```
[Component] Brief description

Example: [Backend] Implemented authentication endpoint
```

### Pull Request Process
1. Create feature branch from `develop`
2. Implement changes with atomic commits
3. Open pull request to merge into `develop`
4. Requires at least one team member approval
5. All CI checks must pass before merging

## Semantic Versioning

- **0.1.0** - Initial prototype
- **0.2.0** - Core features implementation
- **0.3.0** - Testing complete
- **1.0.0** - Final deliverable (December 2, 2025)

## Team

- **Ryan & Bader** - Backend and database development
- **Tom & Alyssa** - Frontend development
- All members collaborate on integration tasks

## Security & Privacy

- University email validation for registration
- JWT-based authentication
- Encrypted password storage
- Privacy-first design:
  - Survey data only visible to matching algorithm
  - Limited roommate information sharing (name and contact only)
  - Admin access controls for sensitive data
- Regular security audits
- GDPR-compliant data handling

## Risk Management

### High-Priority Risks
- **Database Performance**: Load testing with 1000+ student profiles
- **Algorithm Complexity**: 3-week development + 1-week buffer allocated
- **Scope Creep**: Version-controlled requirements document

### Monitoring
- Bi-weekly progress assessments
- Daily stand-up meetings
- Issue tracking in GitHub Projects

## Known Limitations

- Maximum 8 students per block
- Block leaders cannot be changed once set
- Matching algorithm runs manually (not automated)
- Single semester scope (no multi-year tracking)

## Future Enhancements

- Real-time matching updates
- Mobile app (iOS/Android)
- In-app messaging between roommates
- Advanced analytics dashboard for housing staff
- Integration with campus housing management systems
- Automated conflict resolution suggestions

## Documentation

- API documentation: `/docs/api.md`
- Database schema: `/docs/database-schema.sql`
- User guide: `/docs/user-guide.md`
- Admin manual: `/docs/admin-manual.md`

## Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Contact the development team
- Refer to project documentation

## License

This project is developed as part of CSC190 Software Engineering coursework.

---

**Last Updated:** November 5, 2025  
**Project Status:** In Development  
**Current Version:** 0.2.0
