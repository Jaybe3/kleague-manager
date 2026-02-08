# KLeague Manager

A full-stack web application for managing a 10-team fantasy football keeper league with complex multi-year keeper rules that no off-the-shelf platform supports.

**Live:** [kleague-manager.vercel.app](https://kleague-manager.vercel.app)

## The Problem

A 10-team keeper league on CBS Sports has multi-year keeper cost rules (round escalation, free agent pricing, trade inheritance, conflict resolution) that CBS can't natively support. The commissioner was managing it all through Excel spreadsheets — error-prone, opaque to league members, and a massive time sink every draft season.

## The Solution

A web app that automates keeper eligibility calculations, tracks multi-year player costs, handles conflict resolution, and gives every team manager a transparent view of the draft board.

### Key Features

- **Automated Keeper Cost Engine** — Calculates escalating keeper costs across multiple seasons with round-reduction rules, free agent pricing (Round 15 base), trade inheritance, and automatic ineligibility detection
- **28-Round × 10-Team Draft Board** — Visual draft board showing keeper selections, available picks, and round conflicts
- **Keeper Conflict Resolution** — Detects and handles multiple keepers at the same round cost, enforces bump rules
- **Commissioner Admin Panel** — Import historical draft data (Excel), manage teams/slots, enter trades, set deadlines, override keeper costs
- **Team Manager Dashboard** — Select keepers, view eligibility and cost projections, submit selections before deadline
- **Deadline Enforcement** — Locks keeper selections after commissioner-set deadlines
- **Full Audit Trail** — Every action logged for transparency and dispute resolution

## Keeper Cost Rules

```
Drafted Players:
  Year 1 (Draft year):    Drafted at Round X
  Year 2 (First keeper):  Keep at Round X (same)
  Year 3 (Second keeper): Keep at Round X-4
  Year 4+:                Continue -4 per year until ineligible (< Round 1)

Free Agents (never drafted):
  Year 2: Round 15 → Year 3: Round 11 → Year 4: Round 7 → continues -4/year

Trades: Player retains original draft year/round. Receiving team inherits cost.
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 + TypeScript |
| Database | PostgreSQL via Prisma ORM |
| Auth | NextAuth.js (credentials) |
| UI | Tailwind CSS + Radix UI + shadcn/ui |
| Testing | Vitest |
| Hosting | Vercel |

## Project Structure

```
kleague-manager/
├── app/
│   ├── (auth)/              # Login & registration
│   ├── (dashboard)/         # Protected routes
│   │   ├── admin/           # Commissioner tools
│   │   ├── draft-board/     # Visual draft board
│   │   ├── my-team/         # Team manager view
│   │   └── rules/           # League rules display
│   └── api/                 # REST API routes
│       ├── admin/           # Admin endpoints
│       ├── auth/            # Auth endpoints
│       ├── draft-board/     # Draft board data
│       ├── keeper/          # Keeper calculations
│       ├── my-team/         # Team data
│       └── teams/           # Team management
├── components/              # Shared UI components
├── lib/                     # Business logic & utilities
├── prisma/
│   ├── schema.prisma        # Database schema (11 models)
│   ├── migrations/          # Version-controlled migrations
│   └── seed.ts              # League rules seed data
├── scripts/                 # Data import & admin scripts
├── types/                   # TypeScript type definitions
└── docs/                    # Additional documentation
```

## Data Model

The schema handles the complexity of multi-year keeper tracking across team ownership changes:

- **TeamSlots** — Permanent league positions (1-10) that persist across seasons
- **Teams** — Season-specific team instances tied to slots
- **PlayerAcquisitions** — Full acquisition history (draft, free agent, trade) with original round tracking
- **KeeperSelections** — Per-season keeper picks with calculated costs and conflict detection
- **KeeperOverrides** — Commissioner overrides for edge cases
- **AuditLog** — Full action history for transparency

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Installation

```bash
git clone https://github.com/Jaybe3/kleague-manager.git
cd kleague-manager
npm install
```

### Environment Setup

```bash
# Create .env file
DATABASE_URL="postgresql://user:password@localhost:5432/kleague"
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### Database Setup

```bash
npx prisma migrate dev
npx prisma db seed
```

### Run

```bash
npm run dev
# Open http://localhost:3000
```

## Why I Built This

Off-the-shelf fantasy platforms (CBS, ESPN, Yahoo) don't support custom keeper cost rules. The league had been running on spreadsheets for years, which meant manual calculations, no transparency for managers, and the commissioner spending hours every draft season resolving conflicts. I built this to solve a real problem where existing tools failed.
