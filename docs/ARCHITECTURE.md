# Architecture

This document describes the system design, data flow, and key technical decisions for KLeague Manager.

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

---

## Core Concepts

### Slot-Based Team Identity

**Problem:** CBS Sports retroactively renames historical data when teams rebrand. A team called "Discount Belichick" in 2023 might appear as "Seal Team Nix" when viewing 2023 data in 2025.

**Solution:** Permanent franchise slots (1-10) that never change.
```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  TeamSlot   │──────<│  TeamAlias  │       │    Team     │
│  (1-10)     │       │  name+years │       │  per season │
│  permanent  │       │             │       │             │
└─────────────┘       └─────────────┘       └─────────────┘
       │                                           │
       │              ┌─────────────┐              │
       └─────────────>│ Acquisition │<─────────────┘
                      │  slotId     │
                      │  teamId     │
                      └─────────────┘
```

- `TeamSlot`: 10 permanent records, never changes
- `TeamAlias`: Maps team names → slots with year ranges
- `Team`: Season-specific team record (name, draft position, manager)
- Acquisitions reference both `slotId` (permanent) and `teamId` (season-specific)

### Keeper Cost Calculation

The keeper calculation engine determines what draft round a player costs to keep based on:

1. **Acquisition Type** - DRAFT, FA (Free Agent), or TRADE
2. **Original Draft Round** - Where player was first drafted
3. **Years Kept** - How many seasons the player has been kept
4. **Chain Breaks** - If a player was dropped and re-acquired

**Cost Rules:**
- Year 2 (1st keeper year): Keep at original cost
- Year 3+: Cost decreases by 4 rounds per year
- Ineligible: When cost would be < Round 1

**Example:**
```
Player drafted Round 10:
- Year 2: R10 (base cost)
- Year 3: R6  (10 - 4)
- Year 4: R2  (6 - 4)
- Year 5: INELIGIBLE (2 - 4 = -2)
```

**Chain Break Detection:**
When a player is NOT kept (dropped or not selected), the keeper chain breaks. If re-acquired later, they start fresh.
```
2023: DRAFT R19 → 2024: DRAFT R19 (kept) → 2025: FA (NOT kept, chain broken)
2026 cost = R15 (fresh FA), not R11 (what it would be if chain continued)
```

### Rules Engine

League rules can change over time. The rules engine allows:

- Toggling rules on/off per season
- Rules have an `effectiveSeason` (when they started)
- Calculator checks `isRuleActive(code, year)` before applying logic

**Current Rules:**
| Code | Description |
|------|-------------|
| KEEPER_COST_YEAR_2 | Year 2 keeps at base cost |
| KEEPER_COST_YEAR_3_PLUS | -4 per year after Year 2 |
| KEEPER_INELIGIBILITY | Cost < R1 = ineligible |
| TRUE_FA_ROUND_15 | Undrafted FAs cost R15 |
| TRADE_INHERITS_COST | Trades inherit original draft cost |
| FA_INHERITS_DRAFT_ROUND | FAs inherit same-season draft round |
| KEEPER_ROUND_BUMP | Allow bumping to earlier round |

---

## Data Flow

### Import Flow
```
CBS Copy/Paste → Parser → Team Mapper → Database
      │              │           │
      │              │           └─ Resolves team name → slotId
      │              └─ Extracts picks/transactions
      └─ Raw text from CBS website
```

### Keeper Selection Flow
```
Manager Views Roster
        │
        ▼
┌─────────────────────┐
│ getTeamRoster()     │ ← Fetches active acquisitions for slot
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│ calculateKeeperCost │ ← For each player, determine cost
│ for each player     │   based on acquisition history
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│ Display with        │ ← Show cost, eligibility, conflicts
│ eligibility status  │
└─────────────────────┘
        │
        ▼
Manager Selects Keepers
        │
        ▼
┌─────────────────────┐
│ detectConflicts()   │ ← Check for same-round selections
└─────────────────────┘
        │
        ▼
Resolve Conflicts (bump) → Finalize → Locked
```

### Draft Board Generation
```
┌─────────────────────┐
│ For each slot 1-10: │
│ - Get DraftOrder    │ ← Draft position for season
│ - Get TeamAlias     │ ← Current team name
│ - Get Keepers       │ ← Finalized keeper selections
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│ Build 28x10 grid    │
│ - Keeper in cell    │ ← If keeper selected for that round
│ - Empty cell        │ ← Available draft pick
└─────────────────────┘
```

---

## Authentication & Authorization

### Roles

| Role | Access |
|------|--------|
| Guest | Public pages only |
| Manager | Own team roster, keeper selection |
| Commissioner | All manager access + admin pages |

### Route Protection
```typescript
// middleware.ts
- /my-team/* → Requires authentication
- /admin/*   → Requires authentication + isCommissioner
- /login, /register → Public (redirects if already authenticated)
```

### Session

NextAuth.js v5 with JWT strategy. Session includes:
- `user.id`
- `user.email`
- `user.name`
- `user.isCommissioner`

---

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| **Next.js App Router** | Modern React patterns, built-in API routes, Vercel deployment |
| **Prisma ORM** | Type-safe database access, easy migrations, works with SQLite and PostgreSQL |
| **Slot-based identity** | Solves CBS retroactive renaming problem permanently |
| **slotId + teamId dual reference** | Backward compatibility while transitioning to slot-centric model |
| **Pure calculator function** | Testable without database; rule flags passed in |
| **Rules engine** | Supports league rule evolution without code changes |
| **shadcn/ui** | Accessible, customizable components; Forest theme |

---

## Performance Considerations

### N+1 Query Prevention

The roster/keepers page initially had N+1 query issues (168 queries for 33 players). Fixed by:
- Batching player lookups
- Including relations in Prisma queries
- Caching rule flags per request

**Result:** 168 queries → 9-11 queries

### Large Dropdown Optimization

Player dropdown for keeper overrides was slow. Fixed by:
- Lazy loading players only when dropdown opened
- Search/filter to reduce rendered options

---

## Error Handling

### API Responses
```typescript
// Success
{ success: true, data: {...} }

// Error
{ success: false, error: "Human-readable message" }
```

### Common Error Cases

| Scenario | Handling |
|----------|----------|
| Unauthenticated | 401 + redirect to login |
| Unauthorized (not commissioner) | 403 |
| Validation failure | 400 + specific error message |
| Round conflict on finalize | 400 + conflict details |
| Deadline passed | 400 + deadline info |

---

## Future Architecture Considerations

| Area | Current | Future |
|------|---------|--------|
| Database | Single PostgreSQL | Could shard by league if multi-tenant |
| Import | CBS only | Pluggable parsers for ESPN, Yahoo, Sleeper |
| Real-time | Polling | WebSockets for live draft board |
| Mobile | Responsive web | Native app possible |

---

## Related Documents

- [Database Schema](./DATABASE.md) - Detailed schema documentation
- [API Reference](./API.md) - Endpoint specifications
- [Development Guide](./DEVELOPMENT.md) - Setup and coding standards

---

**Last Updated:** February 1, 2026
