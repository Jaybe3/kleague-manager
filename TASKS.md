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
**Status:** COMPLETED
**Completed:** 2026-01-21
**Depends On:** TASK-300

**Objective:** Enable commissioner to set draft order for each season, and display the Draft Board sorted by draft position showing keepers and open slots.

#### Files Created
- `app/(dashboard)/admin/draft-order/page.tsx` - Admin UI for setting draft order
- `app/api/admin/draft-order/route.ts` - GET/PUT endpoints for draft order

#### Files Modified
- `app/api/draft-board/route.ts` - Sort teams by draftPosition, add season selector
- `lib/draft-board/types.ts` - Added draftPosition to DraftBoardTeam, availableSeasons to response
- `components/draft-board/draft-board-grid.tsx` - Column headers show "Pick X" with team name
- `components/draft-board/draft-board-cell.tsx` - Empty cells show "—" instead of blank
- `app/(dashboard)/draft-board/page.tsx` - Added season selector dropdown

#### Bug Fixes During Implementation

**1. Season dropdown empty on /admin/draft-order**
- Cause: API defaulted to latest Season record (2026) which had no teams
- Fix: Query `Team.groupBy` to find seasons that actually have teams, default to latest with data

**2. Draft board defaults to 2027 with no data**
- Cause: Active season is 2026, targetYear = 2026 + 1 = 2027
- Fix: Same approach - find seasons with teams for dropdown, default to latest with data

**3. Grid hidden when 0 keepers**
- Cause: Conditional rendering showed message instead of grid structure
- Fix: Always show grid with empty cells, only hide if no teams exist

**4. /my-team/keepers shows "No team found"**
- Cause: All keepers API routes looked for team where `seasonYear = active season (2026)`, but user only had teams for 2023-2025
- Fix: Changed all keepers API routes to find user's most recent team regardless of season
- Files fixed:
  - `app/api/my-team/keepers/route.ts` (GET and POST)
  - `app/api/my-team/keepers/[playerId]/route.ts` (DELETE)
  - `app/api/my-team/keepers/bump/route.ts` (GET and POST)
  - `app/api/my-team/keepers/finalize/route.ts` (POST)

#### Acceptance Criteria

- [x] Commissioner can access draft order admin page
- [x] Commissioner can set pick positions 1-10 for each team
- [x] Validation prevents duplicate positions
- [x] Draft order saves to database (Team.draftPosition)
- [x] Draft Board displays teams in draft order (not slot order)
- [x] Draft Board shows finalized keepers in correct cells
- [x] Draft Board shows open slots for non-keeper rounds
- [x] Non-commissioners cannot access admin draft order page (403)

---

### TASK-302: Admin Keeper Override
**Status:** COMPLETED
**Completed:** 2026-01-21
**Depends On:** TASK-103-FINAL

**Objective:** Allow commissioner to override calculated keeper costs for special circumstances (trade agreements, league exceptions, etc.)

#### Files Created
- `app/(dashboard)/admin/keeper-overrides/page.tsx` - Admin UI for managing overrides
- `app/api/admin/keeper-overrides/route.ts` - GET (list), POST (create) endpoints
- `app/api/admin/keeper-overrides/[id]/route.ts` - DELETE endpoint

#### Files Modified
- `prisma/schema.prisma` - Added KeeperOverride model with relations to Player and Team
- `lib/keeper/types.ts` - Added `isOverride?: boolean` to KeeperCalculationResult
- `lib/keeper/service.ts` - Check for overrides before calculating keeper cost
- `app/(dashboard)/my-team/page.tsx` - Pass isCommissioner to RosterTable
- `components/roster/roster-table.tsx` - Show ⚙️ indicator for overridden players (commissioner only)

#### Bug Fixes During Implementation

**1. API error handling for missing data**
- Cause: API returned 404 without `availableSeasons` when no data found
- Fix: Always return `availableSeasons`, `teams`, `overrides` arrays (even if empty)
- Return 200 OK with error message in body instead of 404 for graceful handling

**2. Prisma client not recognizing new model**
- Cause: Prisma client needed regeneration after schema change
- Fix: Run `npx prisma generate` after schema changes, restart dev server

#### Acceptance Criteria

- [x] KeeperOverride table exists in database
- [x] Commissioner can view all overrides for a season
- [x] Commissioner can add override for any player on any team
- [x] Commissioner can remove override
- [x] Override round is used instead of calculated cost
- [x] Overridden players show as eligible
- [x] Commissioner sees override indicator on roster (⚙️)
- [x] Non-commissioners do NOT see override indicator
- [x] Override only applies to specified season
- [x] Non-commissioners cannot access admin override page (403)

---

### TASK-303: League Rules Registry
**Status:** COMPLETED
**Completed:** 2026-01-21
**Depends On:** TASK-103-FINAL

**Objective:** Create a registry of league rules with effective seasons, allowing rules to be toggled and documented for transparency.

#### Use Case
- League members can view all rules and when they took effect
- Commissioner can enable/disable rules per season
- Keeper calculation checks if rules are active before applying
- New rules can be added without code changes

#### Database Changes

Add new model to `prisma/schema.prisma`:
```prisma
model LeagueRule {
  id              String   @id @default(cuid())
  code            String   @unique                    // e.g., "KEEPER_COST_YEAR_2"
  name            String                              // Human-readable name
  description     String                              // Full rule explanation
  effectiveSeason Int      @map("effective_season")   // Year rule was introduced
  enabled         Boolean  @default(true)
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@map("league_rules")
}
```

#### Seed Data (7 Rules)

**Effective 2023 (Founding Rules):**

| Code | Name | Description |
|------|------|-------------|
| `KEEPER_COST_YEAR_2` | Year 2 Base Cost | First keeper year: keep at original draft round (or R15 for FA) |
| `KEEPER_COST_YEAR_3_PLUS` | Year 3+ Reduction | Second+ keeper year: cost reduces by 4 rounds per year |
| `KEEPER_INELIGIBILITY` | Keeper Ineligibility | Player becomes ineligible when calculated cost < Round 1 |
| `TRUE_FA_ROUND_15` | True FA Round 15 | Players never drafted use Round 15 as keeper base |
| `TRADE_INHERITS_COST` | Trade Inherits Cost | Traded players retain original draft year/round for keeper calculation |

**Effective 2025 (New Rules):**

| Code | Name | Description |
|------|------|-------------|
| `FA_INHERITS_DRAFT_ROUND` | FA Inherits Draft Round | FA pickup of a player drafted same season inherits that draft round |
| `KEEPER_ROUND_BUMP` | Keeper Round Bump | When two keepers conflict at same round, one must bump to earlier (more expensive) round |

#### Features Required

**1. Public Rules Page**
- Location: `/rules`
- All logged-in users can view
- Display all enabled rules grouped by effective season
- Show rule name, description, effective date
- Read-only for non-commissioners

**2. Admin Rules Page**
- Location: `/admin/rules`
- Commissioner only
- Toggle rules enabled/disabled
- Edit rule descriptions
- Cannot delete founding rules (2023)

**3. Rules Service**
- `lib/rules/service.ts`
- `isRuleActive(code: string, seasonYear: number): boolean`
- `getRulesByEffectiveSeason(year: number): LeagueRule[]`
- `getAllRules(): LeagueRule[]`

**4. Keeper Calculation Integration**
- Modify `lib/keeper/calculator.ts` to check rule activation
- Example: Only apply FA_INHERITS_DRAFT_ROUND if `isRuleActive("FA_INHERITS_DRAFT_ROUND", targetYear)`

#### Files to Create

| File | Purpose |
|------|---------|
| `app/(dashboard)/rules/page.tsx` | Public rules display page |
| `app/(dashboard)/admin/rules/page.tsx` | Admin rules management page |
| `app/api/rules/route.ts` | GET endpoint for all rules |
| `app/api/admin/rules/route.ts` | GET/PATCH endpoints for admin |
| `app/api/admin/rules/[id]/route.ts` | PATCH endpoint for single rule |
| `lib/rules/service.ts` | Rules business logic |
| `prisma/seed-rules.ts` | Seed script for 7 founding rules |

#### Files to Modify

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add LeagueRule model |
| `lib/keeper/calculator.ts` | Check rule activation before applying logic |
| `lib/keeper/service.ts` | Pass season year to calculator for rule checks |

#### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/rules` | List all enabled rules (public) |
| GET | `/api/admin/rules` | List all rules with enabled status |
| PATCH | `/api/admin/rules/[id]` | Toggle enabled or update description |

**PATCH Request Body:**
```json
{
  "enabled": false,
  "description": "Updated rule description"
}
```

#### UI Mockup - Public Rules Page

```
League Rules

2023 Season (Founding Rules)
┌─────────────────────────────────────────────────────────────┐
│ Year 2 Base Cost                                            │
│ First keeper year: keep at original draft round (or R15     │
│ for FA)                                                     │
├─────────────────────────────────────────────────────────────┤
│ Year 3+ Reduction                                           │
│ Second+ keeper year: cost reduces by 4 rounds per year      │
├─────────────────────────────────────────────────────────────┤
│ ... (3 more rules)                                          │
└─────────────────────────────────────────────────────────────┘

2025 Season (New Rules)
┌─────────────────────────────────────────────────────────────┐
│ FA Inherits Draft Round                                     │
│ FA pickup of a player drafted same season inherits that     │
│ draft round                                                 │
├─────────────────────────────────────────────────────────────┤
│ Keeper Round Bump                                           │
│ When two keepers conflict at same round, one must bump to   │
│ earlier (more expensive) round                              │
└─────────────────────────────────────────────────────────────┘
```

#### UI Mockup - Admin Rules Page

```
Manage League Rules

| Rule Name              | Effective | Enabled | [Actions]  |
|------------------------|-----------|---------|------------|
| Year 2 Base Cost       | 2023      | ✓       | [Edit]     |
| Year 3+ Reduction      | 2023      | ✓       | [Edit]     |
| Keeper Ineligibility   | 2023      | ✓       | [Edit]     |
| True FA Round 15       | 2023      | ✓       | [Edit]     |
| Trade Inherits Cost    | 2023      | ✓       | [Edit]     |
| FA Inherits Draft Round| 2025      | ✓       | [Toggle][Edit] |
| Keeper Round Bump      | 2025      | ✓       | [Toggle][Edit] |
```

#### Files Created

| File | Purpose |
|------|---------|
| `prisma/seed.ts` | Seed script for 7 rules |
| `lib/rules/rules-service.ts` | Rules service with isRuleActive, getAllRules, etc. |
| `lib/rules/index.ts` | Exports for rules service |
| `app/(dashboard)/rules/page.tsx` | Public rules display page |
| `app/(dashboard)/admin/rules/page.tsx` | Admin rules management page |
| `app/api/rules/route.ts` | GET endpoint (public, authenticated) |
| `app/api/admin/rules/route.ts` | GET/POST endpoints (commissioner) |
| `app/api/admin/rules/[id]/route.ts` | PATCH/DELETE endpoints (commissioner) |

#### Files Modified

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Added LeagueRule model |
| `package.json` | Added tsx, db:seed script, prisma seed config |
| `app/(dashboard)/my-team/page.tsx` | Added "Rules" link to navigation |

#### Acceptance Criteria

- [x] LeagueRule table exists in database
- [x] 7 rules seeded with correct effective seasons
- [x] Public /rules page displays all enabled rules
- [x] Rules grouped by effective season on public page
- [x] Admin can toggle rules enabled/disabled
- [x] Admin can edit rule descriptions
- [x] Admin can add new rules
- [x] Admin can delete rules (with warning for founding rules)
- [x] `isRuleActive()` returns correct value based on season and enabled status
- [ ] Keeper calculation respects rule activation (moved to backlog)
- [x] Non-commissioners cannot access admin rules page (403)

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

### TASK-501d: UI Foundation - Design System & Layout Shell
**Status:** COMPLETED
**Completed:** January 2026
**Depends On:** TASK-400

**Objective:** Install shadcn/ui, apply Forest dark theme, create responsive layout shell.

#### Forest Theme Colors
| Token | Value | Tailwind |
|-------|-------|----------|
| Background | #111827 | gray-900 |
| Surface | #1f2937 | gray-800 |
| Border | #374151 | gray-700 |
| Text | #f9fafb | gray-50 |
| Text Muted | #9ca3af | gray-400 |
| Accent | #10b981 | emerald-500 |
| Success | #22c55e | green-500 |
| Warning | #f59e0b | amber-500 |
| Error | #ef4444 | red-500 |

#### Files Created
| File | Purpose |
|------|---------|
| `components.json` | shadcn/ui configuration |
| `lib/utils.ts` | cn() utility for className merging |
| `components/ui/*` | 7 shadcn/ui components (button, card, table, select, input, badge, dropdown-menu) |
| `components/layout/app-shell.tsx` | Main wrapper with sidebar + bottom nav |
| `components/layout/sidebar.tsx` | Desktop nav (w-64, fixed left) |
| `components/layout/bottom-nav.tsx` | Mobile nav (fixed bottom) |
| `components/layout/page-header.tsx` | Reusable page header |
| `components/layout/index.ts` | Barrel exports |
| `app/(dashboard)/layout.tsx` | Wrap dashboard pages in AppShell |

#### Files Modified
| File | Change |
|------|--------|
| `app/globals.css` | Forest dark theme CSS variables |
| `app/layout.tsx` | Title: "KLeague Manager" |
| `package.json` | shadcn dependencies added |

#### Navigation Structure
| Label | Path | Access |
|-------|------|--------|
| My Team | /my-team | All users |
| Keepers | /my-team/keepers | All users |
| Draft Board | /draft-board | All users |
| Rules | /rules | All users |
| Admin | /admin/import | Commissioner only |

#### Responsive Behavior
- < 768px: Bottom nav visible, sidebar hidden
- ≥ 768px: Sidebar visible, bottom nav hidden

#### Acceptance Criteria
- [x] shadcn/ui installed and configured
- [x] Forest dark theme applied globally
- [x] Sidebar visible on desktop (≥768px)
- [x] Bottom nav visible on mobile (<768px)
- [x] Active nav highlighted with emerald accent
- [x] Admin link only visible for commissioners
- [x] All existing pages still functional
- [x] No TypeScript or console errors

**Completion Note:** Forest theme applied, responsive layout shell working. Pre-existing slow load on Keepers/My Team pages noted for future optimization (database query issue, not UI-related).

---

### TASK-501e: Restyle My Team Page
**Status:** COMPLETED
**Completed:** January 2026
**Depends On:** TASK-501d

**Objective:** Apply Forest theme and shadcn/ui components to My Team page, using new layout shell.

#### Requirements
- Use shadcn/ui Card component for main content container
- Use shadcn/ui Table component for roster table
- Use shadcn/ui Badge component for player status (Eligible/Ineligible)
- Use shadcn/ui Select for position filter dropdown
- Use PageHeader component from layout
- Remove old inline navigation (now handled by AppShell)
- Remove inline "Back to Dashboard" and redundant nav buttons
- Maintain all existing functionality (sorting, filtering, data display)
- Apply Forest theme colors consistently

#### Files Modified
| File | Change |
|------|--------|
| `app/(dashboard)/my-team/page.tsx` | Restyled with shadcn/ui Card, Button; uses PageHeader; removed old inline nav |
| `components/roster/roster-table.tsx` | Converted to shadcn/ui Table, Badge, Select; improved spacing and borders |

#### Acceptance Criteria
- [x] Page uses shadcn/ui Card for content container
- [x] Roster table uses shadcn/ui Table component
- [x] Status badges use shadcn/ui Badge component
- [x] Position filter uses shadcn/ui Select component
- [x] PageHeader component used for page title
- [x] Old inline navigation removed (sidebar/bottom nav handles this)
- [x] Sorting still works
- [x] Filtering still works
- [x] "Manage Keepers" button still navigates correctly
- [x] Best Value badges still display
- [x] Responsive on mobile
- [x] No TypeScript errors
- [x] Visual consistency with Forest theme

**Completion Note:** My Team page restyled with shadcn/ui components. Roster table improved with better spacing, subtle borders, and cleaner badge styling.

---

### TASK-501f: Restyle Rules Page
**Status:** COMPLETED
**Completed:** January 2026
**Depends On:** TASK-501e

**Objective:** Apply Forest theme and shadcn/ui components to Rules page.

#### Requirements
- Use PageHeader component from layout
- Use shadcn/ui Card for rule groupings (by effective season)
- Remove any old inline navigation (handled by AppShell)
- Apply Forest theme colors consistently
- Clean typography hierarchy for rule names and descriptions
- Maintain grouping by effective season (2023 founding rules, 2025 new rules)

#### Files Modified
| File | Change |
|------|--------|
| `app/(dashboard)/rules/page.tsx` | Restyled with shadcn/ui Card, Badge; uses PageHeader; removed old nav and code labels |

#### Acceptance Criteria
- [x] Page uses PageHeader component
- [x] Rules grouped by season using shadcn Card components
- [x] Old inline navigation removed
- [x] Clean typography (rule name bold, description muted)
- [x] Responsive on mobile
- [x] No TypeScript errors
- [x] Visual consistency with Forest theme

**Completion Note:** Rules page restyled with shadcn/ui Card and Badge. Code labels removed, cleaner typography.

---

### TASK-501g: Restyle Keepers Page
**Status:** COMPLETED
**Completed:** January 2026
**Depends On:** TASK-501f

**Objective:** Apply Forest theme and shadcn/ui components to the Keepers selection page and its sub-components.

#### Requirements
- Use PageHeader component from layout
- Use shadcn/ui Card for content containers
- Use shadcn/ui Table for both selected keepers and eligible players tables
- Use shadcn/ui Badge for status indicators (Eligible, Bumped, Finalized)
- Use shadcn/ui Button for actions (Select, Remove, Bump, Finalize)
- Use shadcn/ui Select for position filter dropdown
- Restyle DeadlineBanner component with Forest theme colors
- Remove old inline navigation (now handled by AppShell)
- Apply Forest theme colors consistently
- Maintain all existing functionality (select, remove, bump, finalize)

#### Files Modified
| File | Change |
|------|--------|
| `app/(dashboard)/my-team/keepers/page.tsx` | Restyled with shadcn/ui Card, Button; uses PageHeader; removed old nav; restyled DeadlineBanner |
| `components/keepers/conflict-alert.tsx` | Applied Forest theme error colors (bg-error/10, border-error/20, text-error) |
| `components/keepers/selected-keepers-table.tsx` | Converted to shadcn/ui Table, Badge, Button |
| `components/keepers/eligible-players-table.tsx` | Converted to shadcn/ui Table, Badge, Button, Select |

#### DeadlineBanner States (Forest Theme)
| State | Background | Border | Text |
|-------|------------|--------|------|
| open | bg-primary/10 | border-primary/20 | text-primary |
| approaching | bg-warning/10 | border-warning/20 | text-warning |
| urgent | bg-error/10 | border-error/20 | text-error |
| passed | bg-error/10 | border-error/20 | text-error |

#### Acceptance Criteria
- [x] Page uses PageHeader component
- [x] Content wrapped in shadcn/ui Card components
- [x] Selected keepers table uses shadcn/ui Table, Badge, Button
- [x] Eligible players table uses shadcn/ui Table, Badge, Button, Select
- [x] Conflict alert uses Forest theme error colors
- [x] Deadline banner uses Forest theme colors per state
- [x] Old inline navigation removed
- [x] All actions still work (select, remove, bump, finalize)
- [x] Filtering and sorting still work
- [x] Responsive on mobile
- [x] No TypeScript errors
- [x] Visual consistency with My Team page (TASK-501e)

**Completion Note:** Completed January 2026. Keepers page restyled with shadcn/ui Card, Table, Badge, Button, Select. Deadline banner uses semantic Forest colors.

---

### TASK-501h: Restyle Draft Board Page
**Status:** COMPLETED
**Completed:** January 2026
**Depends On:** TASK-501g

**Objective:** Apply Forest theme and shadcn/ui components to Draft Board page.

#### Requirements
- Use PageHeader component from layout
- Use shadcn/ui Card for content sections
- Use shadcn/ui Select for season dropdown
- Use shadcn/ui Badge for keeper indicators and stats
- Remove old inline navigation (handled by AppShell)
- Maintain grid layout for draft board (10 teams x N rounds)
- Ensure horizontal scroll works on smaller screens
- Apply Forest theme colors consistently
- Keeper cells should be visually distinct (emerald accent)

#### Files Modified
| File | Change |
|------|--------|
| `app/(dashboard)/draft-board/page.tsx` | Restyled with shadcn/ui Card, Select; uses PageHeader; removed old nav |
| `components/draft-board/draft-board-grid.tsx` | Applied Forest theme to grid cells and headers |
| `components/draft-board/draft-board-cell.tsx` | Restyled cells with Forest theme (emerald for keepers) |
| `components/draft-board/draft-board-legend.tsx` | Restyled legend with Forest theme colors |

#### Acceptance Criteria
- [x] Page uses PageHeader component
- [x] Season selector uses shadcn/ui Select
- [x] Stats badges use Forest theme colors
- [x] Grid maintains 10-column layout
- [x] Horizontal scroll works on mobile
- [x] Keeper cells visually distinct (emerald/primary accent)
- [x] Legend styled consistently
- [x] Old inline navigation removed
- [x] Responsive on mobile
- [x] No TypeScript errors

**Completion Note:** Completed January 2026. Draft Board restyled with shadcn/ui Card, Select. Keeper cells use emerald/primary accent. Legend moved into stats card. During testing, discovered empty 2024/2025 keepers is a data issue (no keeper_selections records) - logged as TASK-600.

---

### TASK-501i: Restyle Admin Import Page
**Status:** COMPLETED
**Completed:** January 2026
**Depends On:** TASK-501h

**Objective:** Apply Forest theme and shadcn/ui components to Admin Import page.

#### Requirements
- Use PageHeader component from layout
- Use shadcn/ui Card for content sections
- Use shadcn/ui Tabs for Import/Trade toggle (instead of custom tabs)
- Use shadcn/ui Select for dropdowns (import type, season, teams)
- Use shadcn/ui Input for text inputs
- Use shadcn/ui Button for actions
- Use shadcn/ui Textarea for paste area
- Remove old inline navigation (handled by AppShell)
- Maintain all existing functionality (import draft/FA, enter trade)
- Apply Forest theme colors consistently
- Success/error messages use Forest semantic colors

#### Files Modified
| File | Change |
|------|--------|
| `app/(dashboard)/admin/import/page.tsx` | Restyled with shadcn/ui Tabs, Card, Select, Input, Button, Textarea |
| `components/ui/tabs.tsx` | Installed shadcn/ui Tabs component |
| `components/ui/textarea.tsx` | Installed shadcn/ui Textarea component |

#### Acceptance Criteria
- [x] Page uses PageHeader component
- [x] Tabs use shadcn/ui Tabs component
- [x] All dropdowns use shadcn/ui Select
- [x] All inputs use shadcn/ui Input
- [x] Buttons use shadcn/ui Button
- [x] Import functionality still works
- [x] Trade entry functionality still works
- [x] Success/error states use Forest semantic colors
- [x] Responsive on mobile
- [x] No TypeScript errors

**Completion Note:** Completed January 2026. Admin Import page restyled with shadcn/ui Tabs, Select, Input, Textarea, Button. Forest semantic colors for success/warning/error states.

---

### TASK-501j: Restyle Admin Draft Order Page + Fix Admin Navigation
**Status:** COMPLETED
**Completed:** January 2026
**Depends On:** TASK-501i

**Objective:** Fix admin navigation in sidebar and apply Forest theme to Admin Draft Order page.

#### Requirements

**Part A: Fix Admin Navigation**
- Update components/layout/sidebar.tsx
- Under COMMISSIONER section, add links to ALL admin pages:
  - Data Import → /admin/import
  - Draft Order → /admin/draft-order
  - Keeper Overrides → /admin/keeper-overrides
  - Rules Management → /admin/rules
  - Seasons → /admin/seasons
- Keep links always visible (not collapsed)
- Active page highlights with emerald accent like other nav items
- Commissioner-only visibility preserved

**Part B: Restyle Draft Order Page**
- Use PageHeader component from layout
- Use shadcn/ui Card for content sections
- Use shadcn/ui Select for season dropdown
- Use shadcn/ui Button for actions (save, reset, move up/down)
- Remove old inline navigation (handled by AppShell)
- Maintain all existing functionality
- Apply Forest theme colors consistently
- Success/error messages use Forest semantic colors

#### Files Modified
| File | Change |
|------|--------|
| `components/layout/sidebar.tsx` | Added 5 admin page links with icons (Database, ListOrdered, Shield, Scale, Calendar) |
| `app/(dashboard)/admin/draft-order/page.tsx` | Restyled with shadcn/ui Card, Select, Button; Forest semantic colors |

#### Acceptance Criteria
- [x] Sidebar shows all 5 admin links under Commissioner section
- [x] Admin links only visible to commissioners
- [x] Active admin page highlights correctly
- [x] Page uses PageHeader component
- [x] Season selector uses shadcn/ui Select
- [x] Buttons use shadcn/ui Button
- [x] Setting draft order still works
- [x] Success/error states use Forest semantic colors
- [x] Responsive on mobile
- [x] No TypeScript errors

**Completion Note:** Completed January 2026. Admin navigation expanded to 5 links. Draft Order page restyled with shadcn/ui components. During testing, discovered BUG-002: cannot set draft order for 2026 because teams don't exist until draft data imported.

---

### TASK-501k: Restyle Admin Keeper Overrides Page
**Status:** COMPLETED
**Completed:** January 2026
**Depends On:** TASK-501j

**Objective:** Apply Forest theme and shadcn/ui components to Admin Keeper Overrides page.

#### Requirements
- Use PageHeader component from layout
- Use shadcn/ui Card for content sections
- Use shadcn/ui Select for dropdowns (season, team, player)
- Use shadcn/ui Input for override round input
- Use shadcn/ui Button for actions
- Use shadcn/ui Table for existing overrides list (styling only, not component)
- Use shadcn/ui Badge for round indicator
- Remove old inline navigation (handled by AppShell)
- Maintain all existing functionality (add/delete overrides)
- Apply Forest theme colors consistently
- Success/error messages use Forest semantic colors

#### Files Modified
| File | Change |
|------|--------|
| `app/(dashboard)/admin/keeper-overrides/page.tsx` | Restyled with shadcn/ui Card, Select, Input, Button; Forest semantic colors |

#### Acceptance Criteria
- [x] Page uses PageHeader component
- [x] All dropdowns use shadcn/ui Select
- [x] Input uses shadcn/ui Input
- [x] Buttons use shadcn/ui Button
- [x] Adding override still works
- [x] Deleting override still works
- [x] Success/error states use Forest semantic colors
- [x] Old inline navigation removed
- [x] Responsive on mobile
- [x] No TypeScript errors

**Completion Note:** Completed January 2026. Keeper Overrides page restyled with shadcn/ui Card, Select, Input, Button. Forest theme applied throughout.

---

### TASK-501l: Restyle Admin Rules + Seasons Pages
**Status:** COMPLETED
**Completed:** January 2026
**Depends On:** TASK-501k

**Objective:** Apply Forest theme and shadcn/ui components to Admin Rules Management and Admin Seasons pages.

#### Requirements (Admin Rules)
- Use PageHeader component from layout
- Use shadcn/ui Card for content sections
- Use shadcn/ui Input for form fields
- Use shadcn/ui Textarea for description fields
- Use shadcn/ui Button for all actions
- Remove old inline navigation (handled by AppShell)
- Maintain all functionality (view, add, edit, delete, toggle rules)
- Apply Forest theme colors consistently
- Success/error messages use Forest semantic colors

#### Requirements (Admin Seasons)
- Use PageHeader component from layout
- Use shadcn/ui Card for content sections
- Use shadcn/ui Input for date/time editing
- Use shadcn/ui Button for all actions
- Remove old inline navigation (handled by AppShell)
- Maintain all functionality (view, edit deadlines)
- Apply Forest theme colors consistently (deadline states)
- Success/error messages use Forest semantic colors

#### Files Modified
| File | Change |
|------|--------|
| `app/(dashboard)/admin/rules/page.tsx` | Restyled with shadcn/ui Card, Input, Textarea, Button; Forest semantic colors |
| `app/(dashboard)/admin/seasons/page.tsx` | Restyled with shadcn/ui Card, Input, Button; Forest semantic colors for deadline states |

#### Acceptance Criteria
- [x] Both pages use PageHeader component
- [x] Inputs use shadcn/ui Input
- [x] Buttons use shadcn/ui Button
- [x] All CRUD operations still work on Rules page
- [x] Deadline editing still works on Seasons page
- [x] Success/error states use Forest semantic colors
- [x] Old inline navigation removed from both pages
- [x] Responsive on mobile
- [x] No TypeScript errors

**Completion Note:** Completed January 2026. Admin Rules and Seasons pages restyled with shadcn/ui Card, Table, Input, Button, Badge. Forest theme applied throughout.

---

### TASK-501m: Restyle Auth Pages (Login/Register)
**Status:** COMPLETED
**Completed:** January 2026
**Depends On:** TASK-501l

**Objective:** Apply Forest theme and shadcn/ui components to Auth Layout, Login, and Register pages.

#### Files Created
| File | Purpose |
|------|---------|
| `components/ui/label.tsx` | Installed shadcn/ui Label component |

#### Files Modified
| File | Change |
|------|--------|
| `app/(auth)/layout.tsx` | Forest theme background (bg-background), shadcn/ui Card |
| `app/(auth)/login/page.tsx` | shadcn/ui Input, Button, Label; Forest error colors |
| `app/(auth)/register/page.tsx` | shadcn/ui Input, Button, Label; Forest error colors |

#### Acceptance Criteria
- [x] Auth layout uses Forest theme background (bg-background)
- [x] Auth container uses shadcn/ui Card
- [x] Login form uses shadcn/ui Input, Button, Label
- [x] Register form uses shadcn/ui Input, Button, Label
- [x] Error messages use Forest semantic colors (bg-error/10, text-error)
- [x] Sign in functionality still works
- [x] Registration functionality still works
- [x] Redirect after login still works
- [x] Responsive on mobile
- [x] No TypeScript errors
- [x] Visual consistency with Forest theme

**Completion Note:** Completed January 2026. Auth pages restyled with shadcn/ui Card, Input, Button, Label. Forest theme applied throughout with emerald primary accent.

---

**Current Status:** TASK-000 ✓, TASK-001 ✓, TASK-002 ✓, TASK-100 ✓, TASK-101 ✓, TASK-102 ✓, TASK-103 ✓, TASK-103-FINAL ✓, TASK-104 ✓, TASK-105 ✓, TASK-201 ✓, TASK-203 ✓, TASK-300 ✓, TASK-301 ✓, TASK-302 ✓, TASK-303 ✓, TASK-400 ✓, TASK-501d ✓, TASK-501e ✓, TASK-501f ✓, TASK-501g ✓, TASK-501h ✓, TASK-501i ✓, TASK-501j ✓, TASK-501k ✓, TASK-501l ✓, TASK-501m ✓

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

---

### TASK-501a: Draft Board Horizontal Scroll UX
**Priority:** Low
**Note:** Draft board with 10 team columns requires horizontal scrolling on smaller screens. Consider:
- Sticky first column (round numbers)
- Better scroll indicators
- Mobile-optimized view

---

### TASK-501b: Keepers Page UI Polish
**Priority:** Low
**Note:** Keepers selection page (/my-team/keepers) has some UI glitchiness. Needs review and polish for smoother user experience.

---

### TASK-501c: Keeper Override Player Dropdown Performance
**Priority:** Low
**Note:** On /admin/keeper-overrides, the player dropdown loads slowly after selecting a team. Consider:
- Caching team rosters
- Loading players in background when page loads
- Adding loading indicator to dropdown

---

### TASK-303b: Integrate Rules into Keeper Calculation
**Priority:** Low
**Depends On:** TASK-303
**Note:** TASK-303 created the rules registry with `isRuleActive()` checks. Future enhancement to integrate these checks into `lib/keeper/calculator.ts` so rules can be toggled per season. Example: Only apply `FA_INHERITS_DRAFT_ROUND` if `isRuleActive("FA_INHERITS_DRAFT_ROUND", targetYear)`.

**Implementation:**
- Modify `lib/keeper/calculator.ts` to import `isRuleActive` from rules service
- Wrap rule-specific logic in `isRuleActive()` checks
- Pass `targetYear` through calculation pipeline for rule activation checks

---

### TASK-600: Backfill Historical Keeper Selections
**Priority:** Low
**Status:** BACKLOG
**Depends On:** None

**Objective:** Populate keeper_selections table with historical data for 2024 and 2025 seasons so draft board shows past keepers.

**Context:**
- Draft board correctly queries keeper_selections table
- Only 2026 has data (3 finalized keepers)
- 2024/2025 show empty because no keeper_selections records exist
- Need to determine source of historical keeper data (Excel? CBS export? Manual entry?)

**Acceptance Criteria:**
- [ ] Identify source of 2024 keeper decisions
- [ ] Identify source of 2025 keeper decisions
- [ ] Create script or import process to backfill data
- [ ] Draft board displays keepers for 2024 season
- [ ] Draft board displays keepers for 2025 season

**Notes:**
- Discovered during TASK-501h (Draft Board restyle)
- Not blocking - cosmetic/historical completeness issue

---

### BUG-001: Keeper Selection Round Conflict Not Showing Error
**Priority:** Medium
**Status:** BACKLOG
**Type:** Bug

**Problem:**
On Keepers page, when selecting a player for a round that's already taken by another keeper, the selection silently fails. Player doesn't appear in Selected Keepers section and no error message is shown.

**Steps to Reproduce:**
1. Go to /my-team/keepers
2. Select a player at Round 25 (e.g., Jaylon Carlies)
3. Try to select another player at Round 25 (e.g., Sam LaPorta)
4. Sam LaPorta does not appear in Selected Keepers, no error shown

**Expected Behavior:**
Either:
- Show error message explaining round conflict, OR
- Show conflict alert prompting user to bump one of the players

**Actual Behavior:**
Selection silently fails, no feedback to user.

**Notes:**
- Discovered during TASK-501g testing
- May be related to existing ConflictAlert component not triggering
- Check /api/my-team/keepers POST handler for validation logic

---

### TASK-601: Redesign Trade Entry Feature
**Priority:** Low
**Status:** BACKLOG
**Type:** Enhancement

**Problem:**
Current trade entry form has UX issues:
- Manual player name typing is error-prone and can corrupt data
- Only handles single player trades, not multi-player trades
- No player search/autocomplete from existing roster

**Proposed Solution:**
- Add player search/autocomplete from source team's roster
- Support multi-player trades (Player A + Player B for Player C)
- Validate players exist before submission
- Show trade preview before confirming

**Notes:**
- Discovered during TASK-501i testing
- Deprioritized - current import from CBS handles most trade data
- Manual entry is edge case for commissioner corrections

---

### BUG-002: Cannot Set Draft Order or Keepers for Future Season
**Priority:** High
**Status:** BACKLOG
**Type:** Bug

**Problem:**
Draft order page and keeper selection only work for seasons that have teams. But teams are only created when draft data is imported. This creates a chicken-and-egg problem - can't prepare for a draft that hasn't happened yet.

**Expected Workflow:**
1. Commissioner creates 2026 season (done - exists with isActive=true)
2. Commissioner sets 2026 draft order BEFORE draft
3. Managers select 2026 keepers BEFORE draft
4. Draft happens with keepers locked at their rounds
5. Draft data imported afterward

**Current Broken State:**
- 2026 season exists but has no teams
- Draft order dropdown doesn't show 2026
- Keeper selection can't work without teams
- Blocked until draft data imported (which happens AFTER draft)

**Proposed Solution:**
- Create teams for a season when the season is created (or via separate "Initialize Season" action)
- Copy team slots/names from previous season as starting point
- Allow draft order and keeper selection before draft data exists

**Notes:**
- Discovered during TASK-501j
- Blocks 2026 draft preparation
- Should be addressed before next draft season
