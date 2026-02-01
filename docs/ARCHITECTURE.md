# Architecture

This document describes the system design, data flow, and key technical decisions for KLeague Manager.

**Audience:** Architects, senior developers, technical stakeholders

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Core Concepts](#core-concepts)
3. [Data Model](#data-model)
4. [Module Reference](#module-reference)
5. [Data Flow](#data-flow)
6. [Authentication & Authorization](#authentication--authorization)
7. [Security](#security)
8. [Testing](#testing)
9. [Key Technical Decisions](#key-technical-decisions)
10. [Performance](#performance)
11. [Technical Debt & Risks](#technical-debt--risks)
12. [Monitoring & Debugging](#monitoring--debugging)
13. [Future Considerations](#future-considerations)

---

## System Overview

KLeague Manager is a full-stack Next.js application that manages fantasy football keeper league data. The system tracks player acquisitions across seasons, calculates keeper costs based on configurable rules, and provides interfaces for both team managers and commissioners.
```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  Auth Pages │  │  Dashboard  │  │     Admin Pages         │ │
│  │  - Login    │  │  - My Team  │  │  - Draft Order          │ │
│  │  - Register │  │  - Keepers  │  │  - Import               │ │
│  │             │  │  - Draft    │  │  - Overrides            │ │
│  │             │  │    Board    │  │  - Rules                │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API LAYER (Next.js)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ /api/auth/*  │  │/api/my-team/*│  │   /api/admin/*       │  │
│  │ NextAuth.js  │  │ Roster,      │  │   Draft order,       │  │
│  │              │  │ Keepers      │  │   Import, Overrides  │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BUSINESS LOGIC (lib/)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ lib/keeper/  │  │lib/importers/│  │    lib/slots/        │  │
│  │ - calculator │  │ - draft      │  │    - team-mapper     │  │
│  │ - service    │  │ - transaction│  │    - team-initializer│  │
│  │ - selection  │  │ - parser     │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌──────────────┐                                               │
│  │ lib/rules/   │                                               │
│  │ - service    │                                               │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATA LAYER (Prisma ORM)                      │
│                                                                 │
│    PostgreSQL (Production)  /  SQLite (Development)            │
└─────────────────────────────────────────────────────────────────┘
```

**Deployment:** Vercel (frontend + API) → Vercel Postgres (database)

---

## Core Concepts

### Slot-Based Team Identity

**Problem:** CBS Sports retroactively renames historical data when teams rebrand. A team called "Discount Belichick" in 2023 might appear as "Seal Team Nix" when viewing 2023 data in 2025.

**Solution:** Permanent franchise slots (1-10) that never change.

| Entity | Purpose | Lifespan |
|--------|---------|----------|
| `TeamSlot` | Permanent franchise identity (1-10) | Forever |
| `TeamAlias` | Maps team names → slots with year ranges | Updated on rename |
| `Team` | Season-specific record (name, draft position, manager) | Per season |

**Lookup:** `getSlotIdFromTeamName(name, year)` resolves any historical team name to its permanent slot.

### Keeper Cost Calculation

The keeper calculation engine determines what draft round a player costs to keep.

**Inputs:**
- Acquisition type (DRAFT, FA, TRADE)
- Original draft round (or R15 for true FA)
- Years kept on this slot

**Rules:**
| Year | Cost |
|------|------|
| Year 2 (1st keeper year) | Base cost (draft round or R15) |
| Year 3 | Base - 4 |
| Year 4 | Base - 8 |
| Year N | Base - (4 x (N-2)) |
| Ineligible | When cost < Round 1 |

**Chain Break Detection:**

CBS creates a new DRAFT record each year a player is kept. If no DRAFT record exists for year N when there was one for year N-1, the player was NOT kept. Chain is broken. Later acquisition = clean slate.
```
Example:
2023: DRAFT R19 (original)
2024: DRAFT R19 (kept - CBS created new record)
2025: FA        (NOT kept - chain broken)
2026: Cost = R15 (fresh FA start), NOT R11 (what continued chain would be)
```

**Algorithm:** See `lib/keeper/service.ts` → `findKeeperBaseAcquisition()`

### Rules Engine

League rules evolve. The rules engine allows toggling behavior by season.

| Code | Description | Default |
|------|-------------|---------|
| `KEEPER_COST_YEAR_2` | Year 2 keeps at base cost | Enabled |
| `KEEPER_COST_YEAR_3_PLUS` | -4 per year after Year 2 | Enabled |
| `KEEPER_INELIGIBILITY` | Cost < R1 = ineligible | Enabled |
| `TRUE_FA_ROUND_15` | Undrafted FAs cost R15 | Enabled |
| `TRADE_INHERITS_COST` | Trades inherit original cost | Enabled |
| `FA_INHERITS_DRAFT_ROUND` | FAs inherit same-season draft round | Enabled (2025+) |
| `KEEPER_ROUND_BUMP` | Allow bumping to earlier round | Enabled |

**Usage:** `isRuleActive(code, seasonYear)` checks if rule applies.

---

## Data Model

### Simplified ERD
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    User      │     │   TeamSlot   │     │    Season    │
│──────────────│     │──────────────│     │──────────────│
│ id           │     │ id (1-10)    │     │ year         │
│ email        │     │ managerId ───┼────>│ isActive     │
│ isCommissioner    │     │              │     │ keeperDeadline│
└──────────────┘     └──────────────┘     └──────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
     ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
     │  TeamAlias   │ │  DraftOrder  │ │     Team     │
     │──────────────│ │──────────────│ │──────────────│
     │ slotId       │ │ slotId       │ │ slotId       │
     │ teamName     │ │ seasonYear   │ │ seasonYear   │
     │ validFrom    │ │ position     │ │ teamName     │
     │ validTo      │ │              │ │ draftPosition│
     └──────────────┘ └──────────────┘ └──────────────┘
                                              │
                                              ▼
┌──────────────┐     ┌───────────────────────────────────┐
│    Player    │     │        PlayerAcquisition          │
│──────────────│     │───────────────────────────────────│
│ id           │<────│ playerId                          │
│ name         │     │ teamId (legacy)                   │
│ position     │     │ slotId (primary)                  │
│ nflTeam      │     │ seasonYear                        │
└──────────────┘     │ acquisitionType (DRAFT/FA/TRADE)  │
                     │ acquisitionDate                   │
                     │ draftRound / draftPick            │
                     │ droppedDate (null = active)       │
                     └───────────────────────────────────┘
                                    │
                     ┌──────────────┴──────────────┐
                     ▼                             ▼
          ┌──────────────────┐          ┌──────────────────┐
          │ KeeperSelection  │          │  KeeperOverride  │
          │──────────────────│          │──────────────────│
          │ teamId / slotId  │          │ teamId / slotId  │
          │ playerId         │          │ playerId         │
          │ seasonYear       │          │ seasonYear       │
          │ keeperRound      │          │ overrideRound    │
          │ isFinalized      │          │                  │
          └──────────────────┘          └──────────────────┘
```

**Full schema:** See [DATABASE.md](./DATABASE.md)

---

## Module Reference

### lib/keeper/ - Keeper Cost Engine

| File | Purpose |
|------|---------|
| `calculator.ts` | Pure function: calculates keeper cost from inputs |
| `calculator.test.ts` | 33 unit tests covering all scenarios |
| `service.ts` | Orchestration: finds base acquisition, calls calculator |
| `selection-service.ts` | Keeper selection CRUD, conflict detection, finalization |
| `selection-types.ts` | TypeScript interfaces for selection data |
| `db.ts` | Database queries for roster/acquisition data |
| `types.ts` | TypeScript interfaces for keeper calculation |
| `index.ts` | Public exports |

### lib/importers/ - CBS Data Import

| File | Purpose |
|------|---------|
| `draft-importer.ts` | Parses and imports draft pick data |
| `transaction-importer.ts` | Parses and imports FA/trade transactions |
| `team-mapper.ts` | Resolves team names → slotId |
| `parser.ts` | Text parsing utilities |

### lib/slots/ - Team Identity

| File | Purpose |
|------|---------|
| `team-mapper.ts` | `getSlotIdFromTeamName()` lookup |
| `team-initializer.ts` | Creates Team records for future seasons |
| `draft-order-service.ts` | Draft order CRUD |
| `index.ts` | Public exports |

### lib/rules/ - Rules Engine

| File | Purpose |
|------|---------|
| `rules-service.ts` | `isRuleActive()`, `fetchRuleFlags()` |

### lib/ - Shared

| File | Purpose |
|------|---------|
| `auth.ts` | NextAuth.js configuration |
| `db.ts` | Prisma client singleton |
| `utils.ts` | Utility functions |

---

## Data Flow

### Import Flow
```
CBS Website → Copy/Paste → Import Page → Parser → Team Mapper → Database
                                │             │            │
                                │             │            └─ Creates PlayerAcquisition records
                                │             └─ Resolves team name → slotId via TeamAlias
                                └─ Extracts round, pick, player, team from text
```

### Keeper Selection Flow
```
Manager loads /my-team/keepers
        │
        ▼
┌───────────────────────────────┐
│ 1. Get manager's slot         │  ← TeamSlot.managerId lookup
│ 2. Get active season          │  ← Season.isActive = true
│ 3. Get roster team (year - 1) │  ← Team for previous season
│ 4. Get active acquisitions    │  ← PlayerAcquisition.droppedDate = null
└───────────────────────────────┘
        │
        ▼
┌───────────────────────────────┐
│ For each player:              │
│ - findKeeperBaseAcquisition() │  ← Chain break detection
│ - calculateKeeperCost()       │  ← Apply rules
│ - Check for override          │  ← KeeperOverride table
└───────────────────────────────┘
        │
        ▼
Display roster with costs → Manager selects → detectConflicts() → Finalize
```

### Draft Board Generation
```
Load /draft-board?season=2026
        │
        ▼
┌───────────────────────────────┐
│ For each slot (1-10):         │
│ - Get DraftOrder.position     │
│ - Get TeamAlias.teamName      │
│ - Get KeeperSelections        │
└───────────────────────────────┘
        │
        ▼
Build 28x10 grid (rows = rounds, cols = draft order position)
Each cell: keeper player OR "available"
```

---

## Authentication & Authorization

### Roles

| Role | Description | Access |
|------|-------------|--------|
| Guest | Not logged in | Public pages only |
| Manager | Logged in user | Own team roster, keeper selection |
| Commissioner | `isCommissioner = true` | All manager access + admin pages |

### Route Protection (middleware.ts)

| Route Pattern | Requirement |
|---------------|-------------|
| `/`, `/login`, `/register` | Public |
| `/my-team/*` | Authenticated |
| `/draft-board` | Authenticated |
| `/rules` | Authenticated |
| `/admin/*` | Authenticated + Commissioner |

### Session Data

NextAuth.js v5 with JWT strategy:
```typescript
session.user = {
  id: string,
  email: string,
  name: string,
  isCommissioner: boolean
}
```

---

## Security

| Concern | Mitigation |
|---------|------------|
| SQL Injection | Prisma ORM parameterizes all queries |
| XSS | React escapes output by default |
| CSRF | NextAuth.js includes CSRF protection |
| Password Storage | bcrypt hashing (12 rounds) |
| Session Security | HTTP-only cookies, JWT with AUTH_SECRET |
| Authorization Bypass | Middleware enforces role checks; API routes verify session |
| Data Isolation | Queries filter by user's slotId; managers can only see own team |

**Commissioner Exception:** Commissioners can view/modify any team's data via admin routes.

---

## Testing

### Current Coverage

| Area | Coverage | Location |
|------|----------|----------|
| Keeper Calculator | 33 tests | `lib/keeper/calculator.test.ts` |
| Integration Tests | Manual | Via verification commands in tasks |
| E2E Tests | None | Planned (TASK-500 in backlog) |

### Running Tests
```bash
npm test                    # Run all tests
npm test -- lib/keeper      # Run keeper tests only
npm test -- --coverage      # With coverage report
```

### Test Philosophy

- **Calculator is pure:** Takes inputs, returns outputs. Easy to test exhaustively.
- **Service layer:** Tested via integration/manual verification.
- **UI:** Manual testing with verification commands.

---

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| **Next.js App Router** | Modern React patterns, built-in API routes, seamless Vercel deployment |
| **Prisma ORM** | Type-safe queries, easy schema migrations, supports SQLite (dev) and PostgreSQL (prod) |
| **Slot-based identity** | Permanently solves CBS retroactive renaming; future-proof |
| **Dual slotId + teamId** | Backward compatibility during migration; allows gradual transition |
| **Pure calculator function** | Testable without database; rule flags passed in as parameter |
| **Rules engine with DB storage** | Supports rule evolution without code changes; audit trail |
| **shadcn/ui components** | Accessible, customizable, consistent design system |
| **Forest theme** | Distinctive branding; consistent color palette |

---

## Performance

### Optimizations Implemented

| Issue | Solution | Result |
|-------|----------|--------|
| N+1 queries on roster page | Batch player lookups, include relations | 168 → 9-11 queries |
| Slow player dropdown (overrides) | Lazy load on open, search filter | <100ms render |
| Repeated rule lookups | Fetch all flags once per request | 7 → 1 query |

### Current Limits

| Metric | Current | Notes |
|--------|---------|-------|
| Teams | 10 | Fixed by league structure |
| Players | 664 | Grows ~100/year |
| Acquisitions | 1,521 | Grows ~500/year |
| Page load | <2s | Acceptable |

---

## Technical Debt & Risks

### Known Technical Debt

| Item | Description | Mitigation |
|------|-------------|------------|
| **Dual slotId/teamId** | Acquisitions have both columns; teamId is legacy | TASK-600d in backlog to complete migration |
| **Team auto-creation** | Teams created on-demand for future seasons | Works but adds complexity to keeper route |
| **No TypeScript strict mode** | Some `any` types exist | Enable incrementally |

### Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| CBS changes copy/paste format | Import breaks | Medium | Parser is modular; can adapt |
| User error in import | Bad data | Medium | Preview before commit; audit log |
| Concurrent keeper selection | Race condition | Low | Deadline prevents conflicts; finalization is atomic |
| Database corruption | Data loss | Low | Vercel auto-backups; can restore |

---

## Monitoring & Debugging

### Current State

| Capability | Status |
|------------|--------|
| Error logging | `console.error` in API routes |
| Performance monitoring | None |
| Uptime monitoring | Vercel default |
| Alerting | None |

### Debugging Production Issues

1. **Check Vercel logs:** Dashboard → Project → Logs
2. **Reproduce locally:** Clone prod database to dev, test
3. **Database state:** Use Prisma Studio or direct queries
```bash
# Local Prisma Studio
npx prisma studio

# Production database query (requires connection string)
npx prisma db execute --url $DATABASE_URL --stdin < query.sql
```

### Recommended Future Additions

- Sentry for error tracking
- Vercel Analytics for performance
- Uptime monitoring (e.g., Better Uptime)

---

## Future Considerations

| Area | Current | Future Possibility |
|------|---------|-------------------|
| Multi-league | Single league | Database-per-league or tenant column |
| Platform support | CBS only | Pluggable parsers for ESPN, Yahoo, Sleeper |
| Real-time updates | Polling/refresh | WebSockets for live draft board |
| Mobile | Responsive web | React Native app |
| API | Internal only | Public API for integrations |

---

## Related Documents

- [Database Schema](./DATABASE.md) - Full schema with all fields
- [API Reference](./API.md) - Endpoint specifications
- [Development Guide](./DEVELOPMENT.md) - Local setup, coding standards
- [Security](./SECURITY.md) - Detailed security considerations
- [Deployment](./DEPLOYMENT.md) - Environment configuration

---

**Last Updated:** February 1, 2026
