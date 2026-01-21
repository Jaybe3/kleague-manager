# TASKS.md
## Fantasy Football Keeper League Management System

**Project:** KLeague Manager  
**Version:** 1.0

---

## CRITICAL: Verified Development Framework

**MANDATORY WORKFLOW (NEVER SKIP):**
1. READ PRD.md, TASKS.md, DEVELOPMENT.md before ANY coding
2. CREATE detailed specification for current task
3. WAIT for explicit user approval on specification
4. IMPLEMENT incrementally (one small piece at a time)
5. PROVIDE exact verification commands the user can run
6. SHOW expected vs actual output
7. WAIT for user to verify independently
8. ONLY proceed after explicit user approval

---

## Phase 0: Project Setup & Infrastructure

### TASK-000: Development Environment Setup
**Status:** COMPLETED
**Objective:** Set up local development environment with all necessary tools.

**Completed:**
- Node.js v18+ installed
- SQLite selected for development (simpler setup)
- Git repository initialized
- Next.js 16.1.1 project with TypeScript
- Core dependencies installed (Prisma, Tailwind CSS v4)

**Verification Completed:**
```bash
node --version  # v18+
npm --version   # 9+
npm run dev     # Dev server starts on localhost:3000
```

**Files Created:**
- `package.json` - Project configuration with all dependencies
- `tsconfig.json` - TypeScript configuration
- `next.config.ts` - Next.js configuration
- `eslint.config.mjs` - ESLint configuration
- `postcss.config.mjs` - PostCSS/Tailwind configuration
- `app/` - Next.js App Router structure

---

### TASK-001: Database Schema Design & Setup
**Status:** COMPLETED
**Depends On:** TASK-000

**Objective:** Create database schema using Prisma ORM.

**Tables Created (7 total):**
- `users` - Authentication and user management (email, passwordHash, displayName, isCommissioner)
- `teams` - Team identity with permanent_id (1-10), season tracking, manager relationship
- `players` - Master player list with player_match_key for deduplication
- `seasons` - Yearly configuration (deadline, draft date, total rounds)
- `player_acquisitions` - Draft picks, FAs, trades with acquisition type tracking
- `keeper_selections` - Yearly keeper decisions with round conflicts handled via unique constraints
- `audit_logs` - Change tracking for all user actions

**Verification Completed:**
```bash
npx prisma generate  # Prisma Client generated successfully
npx prisma db push   # Database created at prisma/dev.db
```

**Files Created:**
- `prisma/schema.prisma` - Full schema with all 7 models and relationships
- `prisma/dev.db` - SQLite database file

---

### TASK-002: Authentication System
**Status:** COMPLETED
**Depends On:** TASK-001

**Objective:** Implement user authentication with NextAuth.js v5, session management, and route protection.

**Dependencies Installed:**
- `next-auth@5.0.0-beta.30` - Authentication framework
- `bcryptjs@3.0.3` - Password hashing
- `@types/bcryptjs` - TypeScript types

**Files Created:**
- `lib/db.ts` - Prisma client singleton
- `lib/auth.ts` - NextAuth v5 configuration with credentials provider
- `types/next-auth.d.ts` - TypeScript type extensions for custom user properties
- `app/api/auth/[...nextauth]/route.ts` - NextAuth API route handler
- `app/api/auth/register/route.ts` - User registration endpoint
- `app/(auth)/layout.tsx` - Centered card layout for auth pages
- `app/(auth)/login/page.tsx` - Login form with error handling
- `app/(auth)/register/page.tsx` - Registration form with validation
- `components/providers/session-provider.tsx` - Client-side session wrapper
- `middleware.ts` - Route protection middleware
- `app/(dashboard)/my-team/page.tsx` - Placeholder dashboard with session display

**Files Updated:**
- `app/layout.tsx` - Wrapped with SessionProvider
- `.env` - Added AUTH_SECRET
- `package.json` - Moved @prisma/client to dependencies

**Route Protection Implemented:**
| Route | Access |
|-------|--------|
| `/`, `/login`, `/register` | Public |
| `/my-team`, `/draft-board` | Authenticated users |
| `/admin/*` | Commissioner only |

**Verification Completed:**
- ✓ TypeScript compilation: No errors
- ✓ Registration API creates users with hashed passwords
- ✓ Login authenticates and creates JWT session
- ✓ Protected routes redirect unauthenticated users to login
- ✓ Authenticated users redirected away from login/register pages
- ✓ Sign out clears session and redirects to login
- ✓ Session displays user info (name, email, id, role)

---

## Phase 1: Data Import & Core Models

### TASK-100: Excel Import Parser
**Status:** COMPLETED
**Depends On:** TASK-002

**Objective:** Create Excel parser to import draft data, FA transactions, and support manual trade entry.

**Dependencies Installed:**
- `xlsx@0.18.5` - Excel file parsing

**Files Created:**
- `lib/importers/types.ts` - TypeScript interfaces for import data
- `lib/importers/team-mapper.ts` - Team name → permanentId mapping (10 teams)
- `lib/importers/excel-parser.ts` - Excel sheet parsing utilities
- `lib/importers/draft-importer.ts` - Draft pick import logic
- `lib/importers/transaction-importer.ts` - FA signing import logic
- `lib/importers/index.ts` - Import orchestrator with separate functions
- `app/api/admin/import/route.ts` - Import API endpoint
- `app/api/admin/trade/route.ts` - Manual trade entry API
- `app/(dashboard)/admin/import/page.tsx` - Admin UI with tabs

**Features Implemented:**
- Separate import types: Draft Picks | FA Signings
- User specifies season year for each import
- Manual trade entry form (player, from/to team, date)
- Player deduplication via PlayerMatch key
- Team mapping with permanentId (1-10)

**Data Imported (2024 Season):**
- 10 teams created
- ~270 draft picks imported
- ~243 FA signings imported
- Players deduplicated across imports

**Verification Completed:**
- ✓ Draft import creates season, teams, players, acquisitions
- ✓ FA import adds signings (requires draft import first)
- ✓ Import results display counts and any errors/warnings

**Note:** Manual trade entry UI exists but backend implementation is incomplete. Trade API route is stubbed. Moved to backlog (Phase 5) for future completion.

---

### TASK-101: Keeper Cost Calculation Engine
**Status:** COMPLETED
**Depends On:** TASK-100

**Objective:** Implement keeper cost calculation engine following PRD rules for drafted players, free agents, and trades.

**Files Created:**
- `lib/keepers/keeper-calculator.ts` - Core calculation engine with all rules
- `lib/keepers/types.ts` - TypeScript interfaces for keeper data
- `lib/keepers/roster-service.ts` - Database integration for fetching rosters
- `app/api/teams/[teamId]/roster/route.ts` - API endpoint for team rosters with keeper costs
- `lib/keepers/__tests__/keeper-calculator.test.ts` - Comprehensive test suite

**Keeper Rules Implemented:**
| Acquisition Type | Year 2 | Year 3 | Year 4+ |
|------------------|--------|--------|---------|
| Drafted Round X  | Round X | Round (X-4) | Round (X-8), then -4/year |
| Free Agent       | Round 15 | Round 11 | Round 7, then -4/year |
| Trade            | Inherits original draft/FA rules |

**Ineligibility:** Players become ineligible when calculated cost < Round 1

**CRITICAL RULE CLARIFICATIONS (2026-01-14):**

### Dropped Player Keeper Cost Rule
> Once a player is drafted, they ALWAYS retain their original draft year/round for keeper cost calculations, even if dropped and re-acquired (by anyone).
>
> **Example:**
> - Year 1: Player drafted Round 17
> - Year 3: Keeper cost = Round 13 (17 - 4)
> - Year 3: Player dropped mid-season
> - Year 3: Someone else picks him up as FA
> - Year 4: Keeper cost = Round 9 (13 - 4, continuing from original draft)

### FA Round 15 Rule (Strict Definition)
> FA Round 15 cost ONLY applies to:
> 1. Players NEVER drafted by anyone (true undrafted free agents)
> 2. Previously drafted players who were dropped AND not re-acquired that season (re-enter next draft pool as undrafted)

### Roster Display Rule
> My Team page should only show END OF SEASON roster (current team players).
> - Dropped players should NOT appear on roster
> - Need to filter acquisitions to exclude dropped players

### Implementation Changes Required

**STATUS: COMPLETED (2026-01-16) - See TASK-103**

| # | File | Change | Status |
|---|------|--------|--------|
| 1 | `lib/keeper/calculator.ts` | Fixed year progression: Y2=base, Y3=first -4 | ✓ |
| 2 | `lib/keeper/service.ts` | Search ALL teams for original DRAFT | ✓ |
| 3 | `lib/keeper/service.ts` | Filter out dropped players from roster | ✓ |
| 4 | `prisma/schema.prisma` | Added `droppedDate` field to PlayerAcquisition | ✓ |
| 5 | `lib/keeper/calculator.test.ts` | Updated all 23 test cases for correct rules | ✓ |

**Verification Completed:**
- ✓ 23 unit tests passing covering all keeper scenarios
- ✓ Database integration working with real imported data
- ✓ API endpoint tested with actual 2024 season data
- ✓ Edge cases handled: same-round conflicts, multi-year progressions, traded players

**Test Commands:**
```bash
npm test -- lib/keepers  # 27 tests passing
```

---

### TASK-102: My Team Page
**Status:** COMPLETED
**Depends On:** TASK-101

**Objective:** Create the My Team page where managers can view their current roster with keeper eligibility and costs.

**Implementation Progress:**
- ✓ My Team page with team info header
- ✓ Roster table component with sorting (name, position, cost, status)
- ✓ Filtering by position and eligible-only
- ✓ Visual indicators (green rows, "Best Value" badges)
- ✓ API endpoints (`/api/my-team`, `/api/teams/[teamId]/roster`)
- ⚠️ **BLOCKED:** Keeper cost calculation needs update per FA clarification above

**Files Created:**
- `lib/keepers/types.ts`, `keeper-calculator.ts`, `roster-service.ts`, `index.ts`
- `app/api/my-team/route.ts`
- `app/api/teams/[teamId]/roster/route.ts`
- `components/roster/roster-table.tsx`
- Updated `app/(dashboard)/my-team/page.tsx`

**SPECIFICATION (Approved)**

**User Story:**
As a team manager, I want to see my current roster with each player's keeper cost so I can make informed keeper decisions.

**UI Requirements:**
1. **Page Header**
   - Team name and manager display
   - Current season indicator
   - Link to keeper selection (future TASK-201)

2. **Roster Table**
   | Column | Description |
   |--------|-------------|
   | Player Name | Full name from database |
   | Position | Player position (QB, RB, WR, TE, K, DEF) |
   | Acquisition | How acquired (Draft Rd X, Free Agent, Trade) |
   | Years Kept | Number of years kept (0 if never kept) |
   | Keeper Cost | Round cost if kept next year |
   | Status | Eligible / Ineligible |

3. **Sorting & Filtering**
   - Sort by: Position, Keeper Cost, Status
   - Filter by: Position, Eligible only

4. **Visual Indicators**
   - Green highlight for eligible players
   - Red/gray for ineligible players
   - Badge showing "Best Value" for low-cost keepers

**API Integration:**
- Use existing `/api/teams/[teamId]/roster` endpoint
- Session-based team lookup (manager sees only their team)

**Files to Create:**
- `app/(dashboard)/my-team/page.tsx` - Updated page with roster display
- `components/roster/roster-table.tsx` - Reusable roster table component
- `components/roster/player-row.tsx` - Individual player row component

**Acceptance Criteria:**
- [x] Manager can view their full roster
- [x] Each player shows correct keeper cost from TASK-101 engine
- [x] Ineligible players are clearly marked
- [x] Table is sortable and filterable
- [x] Responsive design for mobile viewing
- [x] Roster shows only end-of-season players (exclude dropped) - via `droppedDate` filter
- [x] Keeper costs use original draft rules - searches ALL teams for original DRAFT

---

### TASK-103: Keeper Cost Rule Corrections
**Status:** COMPLETED
**Completed:** 2026-01-16 (Calculator), 2026-01-20 (Import Wiring)
**Depends On:** TASK-102

**Objective:** Implement correct keeper cost calculation rules per 2026-01-14 clarifications.

**Changes Implemented:**

1. **Schema Update** (`prisma/schema.prisma`)
   - Added `droppedDate` (DateTime?) to PlayerAcquisition

2. **Keeper Calculator** (`lib/keeper/calculator.ts`, `lib/keeper/types.ts`)
   - Fixed `YEARS_AT_BASE_COST` from 2 to 1
   - Y2 = base cost, Y3 = first -4 reduction (was incorrectly Y4)
   - Updated `getLastEligibleYear` formula from `(baseRound + 7) / 4` to `(baseRound + 3) / 4`

3. **Roster Service** (`lib/keeper/service.ts`)
   - `findOriginalAcquisition()` now searches ALL teams for DRAFT first
   - If no DRAFT found → use FA Round 15 rules
   - Roster query filters `droppedDate: null` (only active players)
   - Added `getCurrentSeasonYear()` and `getTeamByManagerId()` helper functions

4. **Tests** (`lib/keeper/calculator.test.ts`)
   - Updated all 23 test expectations for correct year progression
   - All tests passing

5. **Import Wiring (2026-01-20)**
   - Updated `lib/keeper/index.ts` to export service functions
   - Updated `app/(dashboard)/my-team/page.tsx` to use `@/lib/keeper`
   - Updated `app/api/my-team/route.ts` to use `@/lib/keeper`
   - Updated `app/api/teams/[teamId]/roster/route.ts` to use `@/lib/keeper`
   - Updated `components/roster/roster-table.tsx` to use new `PlayerKeeperCostResult` type
   - Deprecated old `lib/keepers/` folder (see `lib/keepers/DEPRECATED.md`)

**Type Mapping (Old → New):**
| Old (`lib/keepers/`) | New (`lib/keeper/`) |
|---------------------|---------------------|
| `getTeamRosterWithKeepers()` | `getTeamRosterWithKeeperCosts()` |
| `RosterWithKeepers` | `TeamRosterWithKeeperCosts` |
| `KeeperCostResult` | `PlayerKeeperCostResult` |

**TODO (Future):**
- Implement reset scenario detection when multi-year data exists
- Player dropped and not picked up rest of season → re-enters draft pool
- Remove deprecated `lib/keepers/` folder once confirmed no issues

**Acceptance Criteria:**
- [x] Keeper cost uses original draft year/round across all teams
- [x] True undrafted FAs correctly use Round 15 rule
- [x] Dropped players excluded from roster display
- [x] All existing tests pass (23/23)
- [x] All app files import from `@/lib/keeper` (not `@/lib/keepers`)
- [x] TypeScript compiles with no errors
- [x] `lib/keepers/` folder deprecated with migration guide

---

### TASK-103b: Fix Keeper Acquisition Lookup Logic
**Status:** SUPERSEDED by TASK-103-FINAL
**Completed:** 2026-01-20
**Depends On:** TASK-103

*See TASK-103-FINAL below for the complete rewrite.*

---

### TASK-103-FINAL: Complete Keeper Acquisition Logic Rewrite
**Status:** COMPLETED
**Completed:** 2026-01-20
**Depends On:** TASK-103
**Supersedes:** TASK-103b

**Objective:** Complete rewrite of keeper acquisition lookup with ALL rules handled correctly.

**Key CBS Behavior:**
When you KEEP a player, CBS creates a NEW "DRAFT" record each year at their keeper cost. So a kept player has MULTIPLE DRAFT records on the same slot across seasons.

**Complete Rules Implemented:**
1. **KEEPER (same slot, multiple seasons):** Find ALL acquisitions on this SLOT across seasons. Return the EARLIEST one - that's when the keeper clock started.
2. **FRESH DRAFT (same slot, first appearance):** Only ONE acquisition exists on this slot. Keeper clock starts now.
3. **TRADE:** Trades preserve history. Find the EARLIEST DRAFT across ALL teams.
4. **FA (same season as a draft):** If player was DRAFTED same season by ANY team (then dropped), inherit that draft round.
5. **TRUE FA:** If player was never drafted that season, use Round 15.

**Algorithm (`findKeeperBaseAcquisition`):**
```
1. Get player's ACTIVE acquisition on this team (droppedDate = null)
2. Get the team's SLOT ID
3. Find ALL acquisitions for this player on this SLOT (any season)
4. If multiple acquisitions exist on this slot:
   → Return the EARLIEST one (keeper clock started there)
5. If only ONE acquisition on this slot (current one):
   a. If DRAFT → Fresh draft, return this acquisition
   b. If TRADE → Find earliest DRAFT across ALL teams (trades preserve full history)
   c. If FA → Check if drafted same season by ANY team
      - If YES → Return that same-season DRAFT (inherit round)
      - If NO → Return FA acquisition (true FA, Round 15)
```

**Changes:**
- Complete rewrite of `findKeeperBaseAcquisition()` with slot-based lookup
- Added `findOriginalDraftForTrade()` helper for TRADE acquisitions
- Removed old `followTradeChainToOrigin()` function

**Test Cases:**
| Player | Situation | Expected 2026 Cost |
|--------|-----------|-------------------|
| Malik Nabers | 2024 Rd 4 on your slot, 2025 kept on your slot | INELIGIBLE (Year 3: 4-4=0) |
| Kenneth Walker III | 2025 Rd 5, first year on your slot | Round 5 (Year 2) |
| Zaire Franklin | 2025 Rd 1, first year on your slot | Round 1 (Year 2) |
| Jayden Daniels | 2024 Rd 1 on your slot, 2025 kept | INELIGIBLE (Year 3: 1-4=-3) |
| Rome Odunze | 2024 Rd 10 on your slot, 2025 kept | Round 6 (Year 3: 10-4) |
| Sam LaPorta | FA 2025, was drafted Rd 25 same season | Round 21 (Year 2: 25-4) |
| George Karlaftis | FA 2025, never drafted in 2025 | Round 15 (Year 2) |

**Acceptance Criteria:**
- [x] Kept players use EARLIEST acquisition on slot (correct year counting)
- [x] Fresh drafts use YOUR draft round
- [x] Trades preserve original keeper history
- [x] Same-season FA pickups inherit that season's draft round
- [x] True FAs use Round 15
- [x] TypeScript compiles with no errors
- [x] All existing tests pass (23/23)

---

### TASK-104: Team Identity System (Slots)
**Status:** COMPLETED
**Completed:** Implemented during development, verified 2026-01-21
**Depends On:** TASK-001

**Objective:** Replace current broken team identity (draft position as permanentId) with proper slot-based system that survives team renames and CBS retroactive name changes.

**Problem Solved:**
- CBS retroactively updates historical data with current team names
- Example: "Discount Belichick" (2023-2024) now shows as "Seal Team Nix" in historical FA data
- Keeper logic must follow the SLOT (seat at table), not the team name

**Implementation:**
- `TeamSlot` table exists with 10 permanent records (slots 1-10)
- `TeamAlias` table exists with 16 name mappings covering 2023-2025
- `Team.slotId` references `TeamSlot.id` for permanent identity
- `getSlotIdFromTeamName()` function in `lib/importers/team-mapper.ts` handles lookups

**Current Team Aliases:**
| Slot | Name | Valid Years |
|------|------|-------------|
| 1 | Gatordontplay | 2023-2024 |
| 1 | Gatordontplayanymorebchesucked | 2025+ |
| 2 | Box of Rocks | 2023-2024 |
| 2 | run ACHANE on her | 2025+ |
| 3 | Woody and the Jets! | 2023+ |
| 4 | Go Go Garrett | 2023-2024 |
| 4 | The Better Business Burrow | 2025+ |
| 5 | Discount Belichick | 2023-2024 |
| 5 | Seal Team Nix | 2025+ |
| 6 | Team 4 | 2023+ |
| 7 | The Bushwhackers | 2023+ |
| 8 | Sweet Chin Music | 2023+ |
| 9 | Fields of Dreams | 2023+ |
| 10 | Ridley Me This | 2023 |
| 10 | Let Bijans be Bijans | 2024 |
| 10 | Nabers Think I'm Selling Dope | 2025+ |

**Acceptance Criteria:**
- [x] TeamSlot table has 10 permanent records
- [x] TeamAlias table has all known name mappings (16 aliases)
- [x] `getSlotIdFromTeamName("Seal Team Nix", 2023)` returns 5 (CBS retroactive rename)
- [x] `getSlotIdFromTeamName("Discount Belichick", 2023)` returns 5
- [x] Team.slotId correctly references TeamSlot.id

---

### TASK-105: Flexible Data Import Parser
**Status:** COMPLETED
**Completed:** Implemented during development, verified 2026-01-21
**Depends On:** TASK-104

**Objective:** Replace hardcoded Excel sheet name validation with flexible import that accepts copy/paste text or any Excel file.

**Implementation:**
- Text parser (`lib/importers/text-parser.ts`) handles copy/paste from CBS
- `parseDraftText()` parses draft picks with "Round N" headers
- `parseTransactionText()` parses FA signings, drops, and trades
- `parsePlayersColumn()` handles multi-player rows (Signed + Dropped in one line)
- `stripEmojis()` removes CBS lock/box emojis that break regex matching
- Continuation line joining for CBS's multi-line transaction format

**Files Created/Modified:**
- `lib/importers/text-parser.ts` - Complete text parser for copy/paste
- `lib/importers/draft-importer.ts` - Uses text parser
- `lib/importers/transaction-importer.ts` - Uses text parser, handles DROP/FA/TRADE
- `lib/importers/index.ts` - Entry points: `importDraftFromText()`, `importFAFromText()`
- `app/api/admin/import/route.ts` - Accepts text input
- `app/(dashboard)/admin/import/page.tsx` - Text paste UI

**Data Successfully Imported:**
- 2023 season: Draft + FA transactions
- 2024 season: Draft + FA transactions
- 2025 season: Draft + FA transactions
- 664 players, 30 teams, ~1,521 acquisitions

**Acceptance Criteria:**
- [x] Can paste draft text, specify year → imports correctly
- [x] Can paste FA text, specify year → imports correctly
- [x] Excel upload still works (reads first sheet)
- [x] No validation on sheet names
- [x] Team names map to slots correctly via TASK-104
- [x] Season created with correct totalRounds (27 for 2023-2024, 28 for 2025+)

---

### TASK-106: Admin Team Management UI
**Status:** NOT NEEDED
**Note:** Slots system (TASK-104) solved the team identity problem. Manual alias management not required - can be handled via database when needed.

---

## Phase 2: Keeper Selection Interface

### TASK-200: Team Roster Display
**Status:** DUPLICATE - See TASK-102 (My Team Page)

---

### TASK-201: Keeper Selection Interface
**Status:** COMPLETE (2026-01-16)
**Depends On:** TASK-102, TASK-103
**Includes:** TASK-202 (Keeper Conflict Resolution)

**Objective:** Allow team managers to select which eligible players to keep for next season, handle round conflicts, and save/finalize selections.

#### Database Changes

**Add `maxKeepers` to Season model:**
```prisma
model Season {
  // ... existing fields ...
  maxKeepers     Int      @default(3) @map("max_keepers")  // NEW
}
```

#### User Flow

1. **View Eligible Players** - Manager sees roster with keeper costs
2. **Select Keepers** - Click to add players (up to maxKeepers)
3. **Handle Conflicts** - If two players at same round, must bump one to EARLIER round
4. **Save Draft** - Can save and return later
5. **Finalize** - Lock selections permanently

#### Conflict Resolution (CRITICAL)

When two players have the same keeper round:
- Manager must "bump" one to an **EARLIER** round (lower number = better pick)
- `newRound` must be **< original keeperCost**
- `newRound` must be **≥ 1**
- `newRound` must not conflict with another selection
- Manager "overpays" to keep both players

**Example:**
- Player A at R6, Player B at R6 (conflict)
- Other selections at R2
- Bump options for Player B: R5, R4, R3 (earlier picks, R1/R2 unavailable)
- CANNOT bump to R7+ (cheaper than actual cost)

#### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/my-team/keepers` | Get selections + eligible players |
| POST | `/api/my-team/keepers/select` | Add player to selections |
| DELETE | `/api/my-team/keepers/select/[playerId]` | Remove player |
| POST | `/api/my-team/keepers/bump` | Bump player to earlier round |
| POST | `/api/my-team/keepers/finalize` | Lock all selections |

#### Files to Create

| File | Purpose |
|------|---------|
| `app/(dashboard)/my-team/keepers/page.tsx` | Keeper selection page |
| `app/api/my-team/keepers/route.ts` | GET/POST endpoints |
| `app/api/my-team/keepers/select/[playerId]/route.ts` | DELETE endpoint |
| `app/api/my-team/keepers/bump/route.ts` | Bump endpoint |
| `app/api/my-team/keepers/finalize/route.ts` | Finalize endpoint |
| `components/keepers/selected-keepers-table.tsx` | Selection display |
| `components/keepers/eligible-players-table.tsx` | Available players |
| `components/keepers/conflict-alert.tsx` | Conflict warning |
| `lib/keeper/selection-service.ts` | Business logic |

#### Acceptance Criteria

- [ ] Manager can view all eligible players with keeper costs
- [ ] Manager can select up to `maxKeepers` players
- [ ] Manager cannot select more than `maxKeepers`
- [ ] Round conflicts are detected and highlighted
- [ ] Manager can bump a player to EARLIER round to resolve conflicts
- [ ] Bump validates new round is available, valid, and < original cost
- [ ] Manager can save selections as draft
- [ ] Manager can remove players from selections
- [ ] Manager can finalize selections (locks them)
- [ ] Finalized selections cannot be modified
- [ ] Commissioner can configure `maxKeepers` per season
- [ ] All API endpoints validate user owns the team

---

### TASK-202: Keeper Conflict Resolution
**Status:** MERGED INTO TASK-201

---

### TASK-203: Deadline Enforcement
**Status:** COMPLETE (2026-01-16)
**Depends On:** TASK-201

**Objective:** Lock keeper selections after commissioner-set deadline, show warnings as deadline approaches, and allow commissioner to extend deadline.

#### Deadline States

| State | Condition | UI Indicator |
|-------|-----------|--------------|
| `open` | > 7 days until deadline | Blue "Deadline: {date}" |
| `approaching` | ≤ 7 days until deadline | Yellow warning banner |
| `urgent` | ≤ 24 hours until deadline | Red urgent banner (pulsing) |
| `passed` | Past deadline | Red "Deadline passed" - actions blocked |

#### Implementation

**Files Created:**
- `lib/keeper/selection-types.ts` - Added `DeadlineState`, `DeadlineInfo` types
- `lib/keeper/selection-service.ts` - Added `getDeadlineState()`, `getDeadlineInfo()`, `canModifySelections()` helpers
- `app/api/admin/seasons/route.ts` - GET/PATCH endpoints for commissioner
- `app/(dashboard)/admin/seasons/page.tsx` - Season deadline management UI

**Files Modified:**
- `app/api/my-team/keepers/route.ts` - Deadline check on POST, deadlineInfo in GET response
- `app/api/my-team/keepers/[playerId]/route.ts` - Deadline check on DELETE
- `app/api/my-team/keepers/bump/route.ts` - Deadline check on POST
- `app/api/my-team/keepers/finalize/route.ts` - Deadline check on POST
- `app/(dashboard)/my-team/keepers/page.tsx` - DeadlineBanner component, UI respects canModify

#### Acceptance Criteria

- [x] Deadline state calculated correctly based on current time
- [x] Appropriate warning banner shown for each state
- [x] All mutation endpoints blocked after deadline passes
- [x] Clear error message when action blocked due to deadline
- [x] Commissioner can view all seasons
- [x] Commissioner can update `keeperDeadline` for any season
- [x] Non-commissioners cannot access admin endpoints (403)
- [x] Extending deadline unblocks mutations immediately

---

## Phase 3: Draft Board Visualization

### TASK-300: Draft Board Grid Display
**Status:** COMPLETE (2026-01-16)
**Depends On:** TASK-201

**Objective:** Read-only grid visualization showing all teams' finalized keeper selections.

**Files Created:**
- `lib/draft-board/types.ts` - TypeScript types
- `app/api/draft-board/route.ts` - API endpoint (GET with ?year param)
- `components/draft-board/draft-board-cell.tsx` - Cell component (keeper/empty)
- `components/draft-board/draft-board-grid.tsx` - Grid table component
- `components/draft-board/draft-board-legend.tsx` - Legend component
- `app/(dashboard)/draft-board/page.tsx` - Main page

**Files Modified:**
- `app/(dashboard)/my-team/page.tsx` - Added nav links (Draft Board, Admin)

**Features:**
- Grid with rounds as rows, teams as columns (sorted by permanentId)
- Finalized keepers shown in amber cells with player name, position, (K) indicator
- Empty cells for available picks
- Summary stats (total keepers, teams submitted)
- Defaults to upcoming season (active year + 1)
- Horizontal scroll on mobile

**Acceptance Criteria:**
- [x] Grid displays all rounds as rows
- [x] Grid displays all 10 teams as columns
- [x] Finalized keeper selections appear in correct cell
- [x] Keeper cells show player name, position, (K) indicator
- [x] Keeper cells have distinct background color (amber)
- [x] Empty cells clearly different from keeper cells
- [x] Legend explains cell colors
- [x] Accessible to all logged-in users
- [x] Defaults to upcoming season

---

### TASK-301: Draft Board with Draft Order Management
**Status:** NOT STARTED
**Priority:** HIGH
**Depends On:** TASK-300

**Objective:** Enable commissioner to set draft order for each season, and display the Draft Board sorted by draft position showing keepers and open slots.

#### Problem
- Draft order changes each year and cannot be imported from CBS
- Current Draft Board sorts teams by slotId (permanent) instead of draftPosition (yearly)
- Commissioner needs UI to manually set draft pick order for each season

#### Features Required

**1. Admin: Set Draft Order**
- Location: `/admin/draft-order`
- Commissioner selects a season year
- Displays all 10 teams with up/down controls to set pick position (1-10)
- Each position must have exactly one team (validation)
- Save updates `Team.draftPosition` for that season's team records

**2. Draft Board Display**
- Sort teams by `draftPosition` (not slotId)
- Columns: Pick 1, Pick 2, ... Pick 10 (in draft order)
- Rows: Round 1, Round 2, ... Round N
- Cells show:
  - KEEPER: Player name, position, "(K)" indicator, amber background
  - OPEN: Empty/available pick, light background

#### Database
- `Team.draftPosition` field already exists
- No schema changes needed

#### Files to Create/Modify

**Create:**
- `app/(dashboard)/admin/draft-order/page.tsx` - Admin UI for setting draft order
- `app/api/admin/draft-order/route.ts` - GET/PUT endpoints for draft order

**Modify:**
- `app/api/draft-board/route.ts` - Sort teams by draftPosition instead of slotId
- `components/draft-board/draft-board-grid.tsx` - Ensure column headers show draft position

#### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/admin/draft-order?year=2026` | Get teams with current draft positions for a season |
| PUT | `/api/admin/draft-order` | Update draft positions for a season |

**PUT Request Body:**
```json
{
  "seasonYear": 2026,
  "draftOrder": [
    { "slotId": 5, "draftPosition": 1 },
    { "slotId": 2, "draftPosition": 2 },
    ...
  ]
}
```

#### UI Mockup - Admin Draft Order Page

```
Draft Order - 2026 Season
[Season Dropdown: 2026 ▼]

| Pick | Team Name              | [Move]   |
|------|------------------------|----------|
| 1    | Seal Team Nix          | [↓]      |
| 2    | run ACHANE on her      | [↑][↓]   |
| 3    | Woody and the Jets!    | [↑][↓]   |
| ...  | ...                    | ...      |
| 10   | Nabers Think I'm Selling| [↑]     |

[Save Draft Order]
```

#### UI Mockup - Draft Board

```
Draft Board - 2026 Season

       | Pick 1      | Pick 2      | Pick 3      | ... | Pick 10
-------|-------------|-------------|-------------|-----|------------
Rd 1   | [OPEN]      | Player A(K) | [OPEN]      | ... | Zaire F(K)
Rd 2   | [OPEN]      | [OPEN]      | Player B(K) | ... | [OPEN]
Rd 3   | Player C(K) | [OPEN]      | [OPEN]      | ... | Davante A(K)
...
```

#### Acceptance Criteria

- [ ] Commissioner can access draft order admin page
- [ ] Commissioner can set pick positions 1-10 for each team
- [ ] Validation prevents duplicate positions
- [ ] Draft order saves to database (Team.draftPosition)
- [ ] Draft Board displays teams in draft order (not slot order)
- [ ] Draft Board shows finalized keepers in correct cells
- [ ] Draft Board shows open slots for non-keeper rounds
- [ ] Non-commissioners cannot access admin draft order page (403)

---

### TASK-302: Admin Keeper Override
**Status:** NOT STARTED
**Priority:** MEDIUM
**Depends On:** TASK-103-FINAL

**Objective:** Allow commissioner to override calculated keeper costs for special circumstances (trade agreements, league exceptions, etc.)

#### Use Case
- Jayden Daniels is calculated as INELIGIBLE for 2026
- League agreed he can be kept at Round 1 due to trade agreement
- Commissioner overrides: Keep at Round 1 for 2026
- 2027: Normal rules resume → INELIGIBLE (no override)

#### Database Changes

Add new model to `prisma/schema.prisma`:
```prisma
model KeeperOverride {
  id          String   @id @default(cuid())
  playerId    String   @map("player_id")
  teamId      String   @map("team_id")
  seasonYear  Int      @map("season_year")
  overrideRound Int    @map("override_round")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  player Player @relation(fields: [playerId], references: [id])
  team   Team   @relation(fields: [teamId], references: [id])

  @@unique([playerId, teamId, seasonYear])
  @@map("keeper_overrides")
}
```

Also add relations to Player and Team models:
- Player: `keeperOverrides KeeperOverride[]`
- Team: `keeperOverrides KeeperOverride[]`

#### Features Required

**1. Admin UI: Manage Keeper Overrides**
- Location: `/admin/keeper-overrides`
- Commissioner can:
  - View all current overrides
  - Add new override (select team → select player → set round → set season)
  - Remove override
- Search/filter by team or player name

**2. Keeper Calculation Integration**
- Modify `lib/keeper/service.ts` to check for overrides
- If override exists for player+team+season → use override round instead of calculated
- Override makes player eligible regardless of calculated status

**3. Override Visibility**
- Commissioner sees indicator (e.g., "⚙️" icon or "Override" badge) next to overridden players
- Regular users see normal keeper cost display (no indicator)
- Override is invisible to non-commissioners

#### Files to Create

| File | Purpose |
|------|---------|
| `app/(dashboard)/admin/keeper-overrides/page.tsx` | Admin UI for managing overrides |
| `app/api/admin/keeper-overrides/route.ts` | GET (list), POST (create) endpoints |
| `app/api/admin/keeper-overrides/[id]/route.ts` | DELETE endpoint |

#### Files to Modify

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add KeeperOverride model |
| `lib/keeper/service.ts` | Check for overrides in keeper cost calculation |
| `app/(dashboard)/my-team/page.tsx` | Show override indicator for commissioner |
| `components/roster/roster-table.tsx` | Display override indicator conditionally |

#### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/admin/keeper-overrides?year=2026` | List all overrides for a season |
| POST | `/api/admin/keeper-overrides` | Create new override |
| DELETE | `/api/admin/keeper-overrides/[id]` | Remove override |

**POST Request Body:**
```json
{
  "playerId": "abc123",
  "teamId": "xyz789",
  "seasonYear": 2026,
  "overrideRound": 1
}
```

#### Keeper Calculation Logic Change

In `getPlayerKeeperCost()`:

```
1. Check if KeeperOverride exists for (playerId, teamId, targetYear)
2. If YES:
   - Return overrideRound as keeperCost
   - Mark isEligible = true
   - Add flag: isOverride = true (for UI)
3. If NO:
   - Continue with normal calculation
```

#### UI Mockup - Admin Override Page

```
Keeper Overrides - 2026 Season
[Season Dropdown: 2026 ▼]

Current Overrides:
| Player         | Team                    | Override Round | [Action] |
|----------------|-------------------------|----------------|----------|
| Jayden Daniels | Nabers Think I'm Selling| Round 1        | [Remove] |

Add New Override:
[Select Team ▼] [Select Player ▼] [Round: __] [Add Override]
```

#### UI Mockup - My Team (Commissioner View)

```
| Player         | Pos | Acquisition  | Keeper Cost   | Status   |
|----------------|-----|--------------|---------------|----------|
| Jayden Daniels | QB  | Draft Rd 1   | Round 1 ⚙️    | Eligible |
```

The ⚙️ icon (or similar indicator) only visible to commissioner.

#### Acceptance Criteria

- [ ] KeeperOverride table exists in database
- [ ] Commissioner can view all overrides for a season
- [ ] Commissioner can add override for any player on any team
- [ ] Commissioner can remove override
- [ ] Override round is used instead of calculated cost
- [ ] Overridden players show as eligible
- [ ] Commissioner sees override indicator on roster
- [ ] Non-commissioners do NOT see override indicator
- [ ] Override only applies to specified season
- [ ] Non-commissioners cannot access admin override page (403)

---

## Phase 4: Admin Features

### TASK-400: Manual Trade Entry
**Status:** COMPLETED
**Completed:** Verified 2026-01-21

**Objective:** Allow commissioner to enter trades manually or import them from CBS transaction data.

**Implementation:**
- Trade parsing included in `lib/importers/text-parser.ts` - parses "Traded from [Team]" format
- Trade handling in `lib/importers/transaction-importer.ts` - creates TRADE acquisitions
- `enterTrade()` function in `lib/importers/index.ts` for manual entry
- Trade API endpoint at `app/api/admin/trade/route.ts`

**Features:**
- Preserves original draft round from trade chain
- Tracks source team via `tradedFromTeamId` field
- Closes source acquisition when creating trade record
- Idempotent import (safe to reimport)

**Data Imported:**
- 8 TRADE records successfully imported to production

**Acceptance Criteria:**
- [x] Trades parsed from CBS transaction text
- [x] Trade preserves original draft round
- [x] Trade tracks source team
- [x] Manual trade entry API works

---

### TASK-401: Bulk Data Import
**Status:** NOT NEEDED - Covered by TASK-105

The flexible text parser in TASK-105 handles bulk import of draft and transaction data via copy/paste from CBS. No separate bulk import feature required.

---

### TASK-402: Audit Log & History
**Status:** NOT NEEDED - Removed from scope

Removed from scope per product owner decision. The `audit_logs` table exists in schema but is not actively used. May be implemented in future if needed.

---

## Phase 5: Testing & Deployment

### TASK-500: End-to-End Testing
### TASK-501: UI/UX Polish
### TASK-502: Documentation & Deployment

---

**Current Status:** TASK-000 ✓, TASK-001 ✓, TASK-002 ✓, TASK-100 ✓, TASK-101 ✓, TASK-102 ✓, TASK-103 ✓, TASK-103-FINAL ✓, TASK-104 ✓, TASK-105 ✓, TASK-201 ✓, TASK-203 ✓, TASK-300 ✓, TASK-400 ✓

**Production Data Status (2026-01-21):**
- All 2023, 2024, 2025 draft and FA data imported
- 664 players, 30 teams (10 per season), ~1,521 acquisitions
- 8 TRADE records
- Keeper cost calculation verified working correctly

---

## Backlog / Future Improvements

### TASK-201-REVISIT: Improve Bump UX
**Priority:** Low
**Note:** User feedback that current bump flow could be better. Consider redesigning the UX for resolving round conflicts.
