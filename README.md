# Dorm Allocation System

Software Engineering  Project - Full Stack Dorm Allocation Application

Discord: https://discord.gg/H7wzewef

## About

This is our software engineering project for creating a dorm room allocation system. The goal is to build an algorithm that can automatically assign students to dorm rooms based on their preferences and requirements.

## Team Members
- [Add your names here]

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Next.js API Routes (to be implemented)
- **Database**: TBD

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm/yarn/pnpm

### Installation

1. Clone the repo
```bash
git clone [repo-url]
cd dorm-allocation
```

2. Install dependencies
```bash
cd dorm-allocation
npm install
```

3. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
dorm-allocation/
├── src/
│   ├── app/          # Next.js pages and routing
│   ├── components/   # React components (to be added)
│   └── lib/          # Utility functions and algorithm
├── public/           # Static files
└── package.json      # Dependencies
```

## Features to Implement

### Phase 1 - Basic Setup ✅
- [x] Initialize Next.js project
- [x] Set up TypeScript
- [x] Configure Tailwind CSS
- [ ] Create basic UI layout

### Phase 2 - Core Features
- [ ] Student registration form
- [ ] Room preference selection
- [ ] Admin dashboard
- [ ] Database setup

### Phase 3 - Algorithm
- [ ] Design allocation algorithm
- [ ] Implement matching logic
- [ ] Handle edge cases
- [ ] Testing with sample data

### Phase 4 - Final Features
- [ ] Results display page
- [ ] Export functionality
- [ ] Basic reporting
- [ ] Documentation

## The Algorithm (Draft)

Our allocation algorithm will consider:
1. Student preferences (room type, location)
2. Roommate requests
3. Year/seniority
4. Special requirements

Basic approach:
- Collect all preferences
- Score each possible assignment
- Use optimization to find best overall allocation
- Handle conflicts manually

## Development Notes

### Running the Project
```bash
# Development
npm run dev

# Build
npm run build

# Start production
npm run start

# Lint
npm run lint
```

### Git Workflow
1. Create a branch for your feature
2. Make your changes
3. Push and create a pull request
4. Get review from team member
5. Merge to main

## TODO List

### Backend
- [ ] Set up database (PostgreSQL/MongoDB?)
- [ ] Create API routes
- [ ] Implement authentication
- [ ] Design data models

### Frontend
- [ ] Student dashboard
- [ ] Admin panel
- [ ] Forms for preferences
- [ ] Results page

### Algorithm
- [ ] Research existing algorithms
- [ ] Design our approach
- [ ] Implement core logic
- [ ] Test with different scenarios

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [TypeScript](https://www.typescriptlang.org)

## Meeting Notes

[Add meeting notes and decisions here]

## Questions/Issues

- How complex should the algorithm be?
- What are the minimum features for the demo?
- Timeline for each phase?
- Which ORM to use with PostgreSQL? (Prisma vs Drizzle vs raw SQL)

## Contact

Join our Discord for discussions: https://discord.gg/H7wzewef

---

**Software Engineering Project - Fall 2025**
