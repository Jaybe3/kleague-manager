# Development Guide

This document provides everything needed to set up, develop, and contribute to KLeague Manager.

**Audience:** Developers

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Environment Setup](#environment-setup)
4. [Project Structure](#project-structure)
5. [Development Workflow](#development-workflow)
6. [Coding Standards](#coding-standards)
7. [Database Operations](#database-operations)
8. [Common Tasks](#common-tasks)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 18+ | LTS recommended |
| npm | 9+ | Comes with Node.js |
| Git | 2.x | For version control |
| PostgreSQL | 15+ | Optional - can use SQLite locally |

### Recommended Tools

| Tool | Purpose |
|------|---------|
| VS Code | IDE with TypeScript support |
| Prisma Extension | Schema syntax highlighting |
| ESLint Extension | Code linting |
| Prettier Extension | Code formatting |

---

## Quick Start
```bash
# 1. Clone repository
git clone https://github.com/[your-repo]/kleague-manager.git
cd kleague-manager

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env.local
# Edit .env.local with your settings

# 4. Initialize database
npx prisma db push

# 5. Seed with sample data (optional)
npx prisma db seed

# 6. Start development server
npm run dev

# 7. Open browser
open http://localhost:3000
```

---

## Environment Setup

### Environment Variables

Create `.env.local` in project root:
```bash
# Database - SQLite for local development
DATABASE_URL="file:./dev.db"

# Or PostgreSQL (for production-like environment)
# DATABASE_URL="postgresql://user:password@localhost:5432/kleague?schema=public"

# Authentication secret (generate: openssl rand -base64 32)
AUTH_SECRET="your-local-development-secret-key-here"

# Environment
NODE_ENV="development"
```

### Database Options

**Option 1: SQLite (Recommended for local dev)**
```bash
DATABASE_URL="file:./dev.db"
```
- No setup required
- File-based, self-contained
- Good for isolated development

**Option 2: Local PostgreSQL**
```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/kleague"
```
- Matches production environment
- Required for testing PostgreSQL-specific features

**Option 3: Production Database (Caution)**
```bash
# Pull from Vercel
vercel env pull .env.local
```
- Use for debugging production issues
- **Be extremely careful** - this is live data

---

## Project Structure
```
kleague-manager/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Auth group (login, register)
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/            # Protected pages group
│   │   ├── admin/              # Commissioner-only pages
│   │   │   ├── draft-order/
│   │   │   ├── import/
│   │   │   ├── keeper-overrides/
│   │   │   ├── rules/
│   │   │   └── seasons/
│   │   ├── draft-board/
│   │   ├── my-team/
│   │   │   └── keepers/
│   │   └── rules/
│   ├── api/                    # API routes
│   │   ├── admin/
│   │   ├── auth/
│   │   ├── draft-board/
│   │   ├── my-team/
│   │   └── rules/
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Home page
│
├── components/                 # React components
│   ├── ui/                     # shadcn/ui components
│   └── [feature]/              # Feature-specific components
│
├── lib/                        # Business logic
│   ├── keeper/                 # Keeper cost calculation
│   │   ├── calculator.ts       # Pure calculation function
│   │   ├── calculator.test.ts  # Unit tests
│   │   ├── service.ts          # Orchestration layer
│   │   ├── selection-service.ts# CRUD for selections
│   │   ├── db.ts               # Database queries
│   │   └── types.ts            # TypeScript interfaces
│   ├── importers/              # CBS data import
│   ├── slots/                  # Team identity management
│   ├── rules/                  # Rules engine
│   ├── auth.ts                 # NextAuth configuration
│   ├── db.ts                   # Prisma client
│   └── utils.ts                # Utilities
│
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── migrations/             # Migration history
│   └── seed.ts                 # Seed data (optional)
│
├── docs/                       # Documentation
├── tasks/                      # Task management
│
├── .clinerules                 # Development rules
├── PRD.md                      # Product requirements
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── vitest.config.ts
```

### Key Directories

| Directory | Purpose |
|-----------|---------|
| `app/` | Pages and API routes (Next.js App Router) |
| `components/ui/` | shadcn/ui components (don't modify) |
| `lib/keeper/` | Core keeper calculation logic |
| `lib/slots/` | Team identity (slot) management |
| `prisma/` | Database schema and migrations |
| `docs/` | Project documentation |
| `tasks/` | Task tracking files |

---

## Development Workflow

### Starting Development
```bash
# Start dev server with hot reload
npm run dev

# In another terminal, open Prisma Studio (database GUI)
npx prisma studio
```

### Making Changes

1. **Read relevant docs** before starting
   - `.clinerules` - Development rules
   - `tasks/INDEX.md` - Current task status
   - Relevant task file in `tasks/`

2. **Create or claim a task** in `tasks/active/`

3. **Implement incrementally**
   - Small commits
   - Test as you go
   - Update task file

4. **Verify changes work**
```bash
   # Type checking
   npm run build

   # Run tests
   npx vitest run

   # Manual verification
   # (follow steps in task file)
```

5. **Commit and push**
```bash
   git add .
   git commit -m "Description of changes"
   git push origin master
```

6. **Update task status** and move to `tasks/completed/`

### Git Workflow
```bash
# Pull latest
git pull origin master

# Make changes and commit
git add .
git commit -m "TASK-XXX: Brief description"

# Push
git push origin master
```

**Commit Message Format:**
```
TASK-XXX: Brief description

- Detail 1
- Detail 2
```

---

## Coding Standards

### TypeScript

- Use TypeScript for all files (`.ts`, `.tsx`)
- Avoid `any` type when possible
- Define interfaces for data structures
- Use strict null checks
```typescript
// Good
interface Player {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
}

function getPlayer(id: string): Player | null {
  // ...
}

// Avoid
function getPlayer(id: any): any {
  // ...
}
```

### React Components

- Use functional components with hooks
- Keep components focused and small
- Extract reusable logic to custom hooks
```tsx
// Good
export function PlayerCard({ player }: { player: Player }) {
  return (
    <div className="p-4 border rounded">
      <h3>{player.firstName} {player.lastName}</h3>
      <p>{player.position}</p>
    </div>
  );
}
```

### API Routes

- Always check authentication first
- Validate input before processing
- Return consistent response shapes
- Log errors server-side, return generic messages to client
```typescript
export async function POST(request: NextRequest) {
  // 1. Auth check
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse and validate input
  const body = await request.json();
  if (!body.playerId) {
    return NextResponse.json({ error: "Player ID required" }, { status: 400 });
  }

  // 3. Business logic
  try {
    const result = await doSomething(body.playerId);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Operation failed:', error);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
```

### Styling

- Use Tailwind CSS classes
- Follow Forest theme color palette
- Use shadcn/ui components when available
```tsx
// Use Tailwind
<div className="bg-forest-900 text-forest-100 p-4 rounded-lg">

// Use shadcn/ui
import { Button } from "@/components/ui/button";
<Button variant="default">Click me</Button>
```

### File Naming

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `PlayerCard.tsx` |
| Utilities | camelCase | `formatDate.ts` |
| API routes | `route.ts` | `app/api/my-team/route.ts` |
| Types | camelCase or types.ts | `types.ts` |
| Tests | `.test.ts` suffix | `calculator.test.ts` |

---

## Database Operations

### View Data
```bash
# Prisma Studio (GUI)
npx prisma studio

# Direct query
npx prisma db execute --stdin <<< "SELECT * FROM users LIMIT 5"
```

### Schema Changes
```bash
# 1. Edit prisma/schema.prisma

# 2. Create migration
npx prisma migrate dev --name description_of_change

# 3. Apply to local database (automatic with migrate dev)

# 4. Commit migration files
git add prisma/
git commit -m "Add migration: description"
```

### Reset Database
```bash
# Reset and re-seed (loses all data)
npx prisma migrate reset

# Or just push schema without migration
npx prisma db push
```

### Query Examples
```typescript
import { db } from "@/lib/db";

// Find one
const user = await db.user.findUnique({
  where: { email: "user@example.com" }
});

// Find many with filter
const players = await db.player.findMany({
  where: { position: "QB" },
  orderBy: { lastName: "asc" }
});

// Include relations
const team = await db.team.findFirst({
  where: { slotId: 10, seasonYear: 2025 },
  include: { acquisitions: true }
});

// Create
const newUser = await db.user.create({
  data: {
    email: "new@example.com",
    passwordHash: hashedPassword,
    displayName: "New User"
  }
});

// Update
await db.user.update({
  where: { id: userId },
  data: { displayName: "Updated Name" }
});

// Delete
await db.user.delete({
  where: { id: userId }
});
```

---

## Common Tasks

### Add a New API Endpoint

1. Create route file: `app/api/[path]/route.ts`
2. Export HTTP method handlers (`GET`, `POST`, etc.)
3. Add authentication check
4. Implement logic
5. Document in `docs/API.md`

### Add a New Page

1. Create page directory: `app/(dashboard)/[name]/`
2. Create `page.tsx` with component
3. Add to navigation if needed
4. Protect with middleware if required

### Add a New Component

1. Create in `components/` directory
2. Use TypeScript with prop interfaces
3. Use Tailwind for styling
4. Export as named export

### Run Tests
```bash
# All tests
npx vitest run

# Watch mode
npx vitest

# Specific file
npx vitest run lib/keeper/calculator.test.ts

# With coverage
npx vitest run --coverage
```

### Update Dependencies
```bash
# Check outdated
npm outdated

# Update all
npm update

# Update specific package
npm install package@latest
```

---

## Troubleshooting

### "Module not found" Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install
```

### Database Connection Issues
```bash
# Check DATABASE_URL is set
echo $DATABASE_URL

# Test connection
npx prisma db pull
```

### Prisma Client Out of Sync
```bash
# Regenerate client
npx prisma generate
```

### Type Errors After Schema Change
```bash
# Regenerate Prisma types
npx prisma generate

# Restart TypeScript server in VS Code
# Cmd+Shift+P → "TypeScript: Restart TS Server"
```

### Build Failures
```bash
# Check for type errors
npm run build

# Common fixes:
# - Import missing types
# - Fix null checks
# - Update deprecated APIs
```

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>
```

---

## Related Documents

- [Architecture](./ARCHITECTURE.md) - System design
- [Database](./DATABASE.md) - Schema reference
- [API Reference](./API.md) - Endpoint documentation
- [Testing](./TESTING.md) - Test strategy
- [Process](./PROCESS.md) - Development process

---

**Last Updated:** February 1, 2026
