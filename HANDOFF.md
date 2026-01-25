# KLeague Manager - Project Handoff Document

**Last Updated:** January 25, 2026
**Session:** TASK-600c, TASK-700, BUG-001, BUG-002, TASK-501b/c Performance Fix

---

## 1. PROJECT OVERVIEW

### What is KLeague Manager?
A web application for managing a 10-team fantasy football keeper league hosted on CBS Sports. CBS doesn't natively support the league's complex multi-year keeper rules, so this app:
- Tracks player acquisitions across seasons
- Calculates keeper costs based on draft round and years kept
- Provides a draft board showing keeper selections
- Handles team renames (CBS retroactively renames historical data)

### Tech Stack
- **Frontend:** Next.js 16 + TypeScript
- **Database:** PostgreSQL (Neon)
- **ORM:** Prisma
- **Auth:** NextAuth.js
- **Hosting:** Vercel (free tier)

### Repository
- GitHub: `https://github.com/Jaybe3/kleague-manager.git`
- Branch: `master`

---

## 2. KEEPER RULES

### Drafted Players
```
Year 1 (Draft year):     Player drafted at Round X
Year 2 (1st keeper):     Keep at Round X (same as drafted)
Year 3 (2nd keeper):     Keep at Round X - 4
Year 4 (3rd keeper):     Keep at Round X - 8
Year 5+ (subsequent):    Previous round - 4

Ineligibility: When cost < Round 1, player becomes INELIGIBLE
```

**Examples:**
- Round 6 draft: Y2=R6, Y3=R2, Y4=INELIGIBLE
- Round 10 draft: Y2=R10, Y3=R6, Y4=R2, Y5=INELIGIBLE

### Free Agents (never drafted by anyone)
```
Year 1 (Pickup year):    Player acquired as FA
Year 2 (1st keeper):     Keep at Round 15
Year 3 (2nd keeper):     Keep at Round 11 (15 - 4)
Year 4 (3rd keeper):     Keep at Round 7
Year 5+ (subsequent):    Previous round - 4
```

### Trades
- Player retains original draft round
- Receiving team inherits keeper cost as if they drafted the player
- Trade does NOT reset the keeper clock

### Dropped Players
- Once drafted, a player ALWAYS retains original draft year/round
- Even if dropped and re-acquired by different team
- FA Round 15 ONLY applies to players NEVER drafted by anyone

**IMPORTANT DESIGN NOTE:** The current code does NOT implement the "dropped players retain draft round" rule. When a player is picked up as FA, they're treated as a true FA (Round 15). This may need to be changed. See Section 7 (Outstanding Issues).

---

## 3. DATABASE SCHEMA

### Core Models

#### TeamSlot (Permanent league positions)
```prisma
model TeamSlot {
  id        Int      @id    // 1-10, permanent positions
  aliases   TeamAlias[]
  teams     Team[]
}
```

#### TeamAlias (Maps team names to slots)
```prisma
model TeamAlias {
  slotId    Int      // Which slot this name belongs to
  teamName  String   // "Discount Belichick", "Seal Team Nix", etc.
  validFrom Int      // Year this name started (2023, 2024, etc.)
  validTo   Int?     // null = current name
}
```
**Purpose:** CBS retroactively renames historical data when teams rebrand. This table tracks all historical names.

#### Team (Team instance per season)
```prisma
model Team {
  id            String
  slotId        Int      // Links to TeamSlot
  teamName      String
  seasonYear    Int
  draftPosition Int
  managerId     String?
  @@unique([slotId, seasonYear])
}
```

#### Player
```prisma
model Player {
  id             String
  firstName      String
  lastName       String
  position       String
  playerMatchKey String   @unique  // "PatrickMahomes" - for deduplication
}
```

#### PlayerAcquisition (The most important table)
```prisma
model PlayerAcquisition {
  id               String
  playerId         String
  teamId           String
  seasonYear       Int
  acquisitionType  String    // "DRAFT", "FA", "TRADE"
  draftRound       Int?      // null for FA, copied from original for TRADE
  draftPick        Int?
  acquisitionDate  DateTime
  tradedFromTeamId String?   // For TRADE type only
  droppedDate      DateTime? // null = still on roster
}
```

**Key Insight:** `droppedDate: null` means player is active on roster. To find a team's current roster:
```typescript
where: { teamId, seasonYear, droppedDate: null }
```

#### Season
```prisma
model Season {
  year           Int      @unique
  draftDate      DateTime
  keeperDeadline DateTime
  totalRounds    Int      // 27 for 2023-2024, 28 for 2025+
  isActive       Boolean  // Only ONE season should be active
}
```

#### KeeperSelection
```prisma
model KeeperSelection {
  teamId                String
  playerId              String
  seasonYear            Int
  keeperRound           Int
  yearsKept             Int
  originalAcquisitionId String
  isFinalized           Boolean

  // Note: @@unique([teamId, playerId, seasonYear]) - prevents duplicate player selection
  // Removed: @@unique([teamId, seasonYear, keeperRound]) - allows temporary conflicts (BUG-001 fix)
}
```

#### DraftOrder (Phase 6 - Slot-Centric)
```prisma
model DraftOrder {
  id         String   @id
  slotId     Int      // Links directly to TeamSlot, NOT Team
  seasonYear Int
  position   Int      // 1-10 draft position

  @@unique([slotId, seasonYear])
  @@unique([seasonYear, position])
}
```
**Key Architecture Change (Phase 6):** Draft order is now stored in a dedicated `DraftOrder` table that links directly to `TeamSlot`. This allows:
- Setting draft order for future seasons BEFORE Team records exist
- Draft order independent of Team table (single source of truth)
- Pre-season planning without creating placeholder teams

**Service:** `lib/slots/draft-order-service.ts` handles all draft order operations:
- `getOrCreateDraftOrder(year)` - Auto-creates from previous season if needed
- `getDraftOrderWithNames(year)` - Returns order with team names from TeamAlias
- `updateDraftOrder(year, entries)` - Updates positions for a season

**Status (Jan 25, 2026):** Phase 6 core migration complete (TASK-600c). Draft order, keeper selection, and draft board all work for future seasons. Technical debt cleanup deferred to TASK-600d.

### The Slot-Based Identity System

**Problem:** CBS Sports retroactively renames historical data when teams rebrand. Example: "Discount Belichick" in 2024 becomes "Seal Team Nix" everywhere in CBS data.

**Solution:** Teams are identified by SLOT (1-10), not by name.

**Lookup Function:** `getSlotIdFromTeamName(name, year)` in `lib/importers/team-mapper.ts`
1. First tries exact match with year range check
2. Falls back to any alias with that name (handles retroactive renames)

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

---

## 4. IMPORT SYSTEM

### Overview
CBS data is copy/pasted from the website. The app parses tab-separated text.

### Key Files

#### `lib/importers/text-parser.ts`
Parses CBS copy/paste data:
- `parseDraftText(text, year)` - Parses draft picks
- `parseTransactionText(text, year)` - Parses FA transactions
- `parsePlayerString(str)` - Extracts player name, position from "Patrick Mahomes QB • KC"
- `parsePlayersColumn(str)` - Handles multi-player rows like "Player1 - Signed Player2 - Dropped"

**Continuation Line Fix (Critical):**
CBS splits multi-player transactions across lines. The parser joins lines that don't start with a date:
```typescript
// Lines 334-354
for (const line of rawLines) {
  const startsWithDate = /^\d{1,2}\/\d{1,2}\/\d{2}/.test(trimmed)
  if (startsWithDate || joinedLines.length === 0) {
    joinedLines.push(trimmed)
  } else {
    // Continuation line - append to previous
    joinedLines[joinedLines.length - 1] += ' ' + trimmed
  }
}
```

#### `lib/importers/draft-importer.ts`
- `importDraftPicks(picks)` - Creates Player, Team, and PlayerAcquisition records
- `findOrCreatePlayer(data)` - Deduplicates players by playerMatchKey
- `findOrCreateTeam(name, year, position)` - Creates team if not exists

#### `lib/importers/transaction-importer.ts`
Main transaction processor. Handles FA, TRADE, DROP.

**Key Logic:**
1. **DROP:** Find active acquisition on this slot, set droppedDate
2. **FA:** Close all active acquisitions for player, create new FA record
3. **TRADE:** Close all active acquisitions, create new TRADE record with original draft round

**Important Fixes Applied:**
- Close ALL active acquisitions before creating new (prevents multi-team issues)
- Skip FA if player already active on same team (prevents duplicates)
- Validate droppedDate > acquisitionDate

#### `lib/importers/index.ts`
Entry points:
- `importDraftFromText(text, year)` - Commissioner imports draft
- `importFAFromText(text, year)` - Commissioner imports FA transactions
- `enterTrade(trade)` - Commissioner manually enters trades

---

## 5. BUGS FIXED THIS SESSION

### Bug Fixes (Commits)

#### `e646a98` - Fix 9 import bugs
Main fix commit:
1. **Bug 10 (Idempotency):** Changed duplicate detection to match player+team+season+type+date
2. **Bug 7 (DROP seasonYear):** Initially added, then REMOVED (see 7a0016a)
3. **Bug 8b (Trade fallback):** Added seasonYear filter to fallback lookup
4. **Bug 8 (sourceAcquisition):** Added seasonYear filter
5. **Bugs 1,3,6 (Close active):** Added `updateMany` before FA/TRADE create
6. **Bug 11 (enterTrade):** Added `updateMany` to close source acquisition
7. **Bug 2 (Skip duplicate):** Skip FA if player already active on same team
8. **Bug 9 (Date validation):** Reject if droppedDate < acquisitionDate

#### `7a0016a` - Fix DROP handler
Removed seasonYear filter from DROP handler. A drop should close whatever active acquisition exists, regardless of when acquired (player drafted in 2024, dropped in 2025).

#### `853c267` - Fix idempotency check
Added acquisitionDate back to duplicate check. Without it, players couldn't be re-signed after being dropped.

#### `2403eca` - Fix parser continuation lines
Join CBS continuation lines before processing.

### Current State After Fixes

**transaction-importer.ts logic:**
```
DROP:
  1. Find active acquisition on this slot (any season)
  2. Validate droppedDate > acquisitionDate
  3. Set droppedDate

FA:
  1. Check if already active on this team → Skip
  2. Check for duplicate (same player+team+season+type+date) → Skip
  3. Close ALL active acquisitions for this player in this season
  4. Create new FA acquisition

TRADE:
  1. Check for duplicate → Skip
  2. Find original DRAFT to copy draft round
  3. Determine tradedFromTeamId
  4. Close ALL active acquisitions for this player in this season
  5. Create new TRADE acquisition with original draft round
```

---

## 6. CURRENT DATA STATE

### Database Counts (as of session end)
- Players: 664
- Teams: 30 (10 per season × 3 seasons)
- Seasons: 4 (2023, 2024, 2025, 2026)
- PlayerAcquisitions: ~1,521
- KeeperSelections: 0

### Active Season
- Season 2026 is active (`isActive = true`)
- This means the app shows 2025 roster (rosterSeasonYear = activeSeasonYear - 1)

### Data Validation Results (After Reimport)
| Check | Result |
|-------|--------|
| Duplicate active (same team) | 0 ✓ |
| Players on multiple teams | 0 ✓ |
| Impossible dates | 0 ✓ |
| Roster sizes | 26-33 per team ✓ |

### Known Data Issues

#### Sam LaPorta has orphaned active acquisitions
```
Team 4 (6)          | 2023 | FA    | null | 2023-10-08 | 2023-10-21
Woody and Jets (3)  | 2023 | FA    | null | 2023-10-22 | null      ← ORPHAN
Go Go Garrett (4)   | 2024 | DRAFT | Rd 8 | 2024-08-25 | null      ← ORPHAN
Sweet Chin Music(8) | 2025 | DRAFT | Rd25 | 2025-08-25 | 2025-09-18
Slot 10             | 2025 | FA    | null | 2025-11-06 | null      ← CURRENT
```
The 2023 FA on Slot 3 and 2024 DRAFT on Slot 4 should have droppedDate set but don't. This is legacy data from before the bug fixes.

---

## 7. OUTSTANDING ISSUES

### 1. Orphaned Active Acquisitions
Some players have multiple active acquisitions across teams/years from before the bug fixes. Need to run a cleanup script to set droppedDate on old acquisitions.

**To identify:**
```sql
SELECT p.first_name, p.last_name, COUNT(*)
FROM player_acquisitions pa
JOIN players p ON pa.player_id = p.id
WHERE pa.dropped_date IS NULL
GROUP BY pa.player_id, p.first_name, p.last_name
HAVING COUNT(*) > 1
```

### 2. FA Acquisitions Don't Inherit Original Draft Round
**Current behavior:** When a player is picked up as FA, they get `draftRound: null` and are treated as Round 15 FA for keeper cost.

**PRD says:** "Once drafted, a player ALWAYS retains original draft year/round for keeper cost. Even if dropped and re-acquired by different team. FA Round 15 ONLY applies to players NEVER drafted by anyone."

**Options:**
1. Change `roster-service.ts` to look up original DRAFT when calculating keeper cost
2. Change FA import to copy original draft round to FA acquisition
3. Accept current behavior (simpler, but doesn't match PRD)

### 3. Keeper Selection Testing
**Update (Jan 25):** Keeper selection is now functional:
- BUG-002 fixed: Team records auto-created for future seasons
- Cascade bug fixed: All routes use active season pattern
- Performance fixed: Page loads quickly (95% query reduction)
- Override lookup fixed: Uses roster team correctly

**Remaining:** Final user testing to confirm all flows work end-to-end (select, bump, remove, finalize).

### 4. Trade Entry Missing from CBS Data
CBS transaction files don't include trades. Trades must be entered manually via Admin > Trade Entry. Historical trades from 2023/2024 may be missing.

### RESOLVED: BUG-002 - Cannot Set Draft Order or Keepers for Future Season
**Fixed:** January 25, 2026 (TASK-700)

**Problem:** Teams only existed after draft import, blocking pre-draft workflow.

**Solution:** Created `lib/slots/team-initializer.ts` to auto-create Team records from slot data when needed. Keeper selection API now calls `ensureTeamForSlot()` before loading roster.

**Cascade Bug Fix (also Jan 25):** Initial implementation had a bug where using "most recent team" logic with `ensureTeamForSlot()` caused runaway team creation (2027-2032+). Fixed by anchoring to active season instead of "most recent team" in both GET and POST handlers of `app/api/my-team/keepers/route.ts`.

### RESOLVED: BUG-001 - Keeper Selection Round Conflict Not Showing Error
**Fixed:** January 25, 2026

**Problem:** Selecting two players at same round silently failed due to database unique constraint.

**Solution:** Removed `@@unique([teamId, seasonYear, keeperRound])` from KeeperSelection schema. Now allows temporary conflicts during selection, detected by `detectConflicts()`, and blocked at finalization.

### RESOLVED: TASK-501b/c - Keepers Page Performance
**Fixed:** January 25, 2026

**Problem:** Keepers page took too long to load (~168 database queries per page load due to N+1 query pattern in `getTeamKeeperSelections`).

**Solution:** Added `getPlayerKeeperCostsBatch()` function to `lib/keeper/service.ts`:
- Fetches rule flags ONCE
- Batches acquisitions (this-slot and cross-slot for trades/FAs)
- Batches overrides
- Processes calculations in memory
- Query count: 168 → 9-11 (95% reduction)

**Additional bugs fixed during investigation:**
1. **Override lookup bug:** Was using most recent team (2026) instead of roster team (2025) for override lookups
2. **Cascade bug:** All keeper routes (`route.ts`, `bump/route.ts`, `[playerId]/route.ts`, `finalize/route.ts`) now use consistent pattern:
   - `getSlotForManager()` for slot lookup
   - `activeSeason.year` for target year
   - `targetYear - 1` for roster year

**Consistent Keeper Route Pattern:**
```typescript
const slot = await getSlotForManager(session.user.id);
const activeSeason = await db.season.findFirst({ where: { isActive: true } });
const targetYear = activeSeason.year;      // 2026 (selecting FOR)
const rosterYear = targetYear - 1;          // 2025 (selecting FROM)
const rosterTeam = await db.team.findFirst({
  where: { slotId: slot.id, seasonYear: rosterYear },
});
```

---

## 8. KEY FILES

### Configuration
| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Database schema |
| `PRD.md` | Product requirements |
| `.clinerules` | Development rules and keeper cost reference |
| `.env` | Environment variables (DATABASE_URL) |

### Import System
| File | Purpose |
|------|---------|
| `lib/importers/text-parser.ts` | Parse CBS copy/paste data |
| `lib/importers/draft-importer.ts` | Import draft picks |
| `lib/importers/transaction-importer.ts` | Import FA/TRADE/DROP |
| `lib/importers/team-mapper.ts` | Map team names to slots |
| `lib/importers/index.ts` | Entry points, enterTrade() |

### Keeper Calculation
| File | Purpose |
|------|---------|
| `lib/keeper/calculator.ts` | Calculate keeper costs |
| `lib/keeper/service.ts` | Fetch roster with keeper costs |
| `lib/keeper/types.ts` | TypeScript types |

### Slot Services (Phase 6)
| File | Purpose |
|------|---------|
| `lib/slots/index.ts` | Slot helpers, getTeamNameForSlot(), getSlotForManager() |
| `lib/slots/draft-order-service.ts` | DraftOrder CRUD, auto-create from prior season |
| `lib/slots/team-initializer.ts` | Create Team records from slot data (fixes BUG-002) |

### API Routes
| File | Purpose |
|------|---------|
| `app/api/admin/import/route.ts` | Import endpoint |
| `app/api/admin/trade/route.ts` | Trade entry endpoint |
| `app/api/my-team/route.ts` | Get user's team roster |
| `app/api/my-team/keepers/route.ts` | Keeper selection |
| `app/api/draft-board/route.ts` | Draft board data |

### Pages
| File | Purpose |
|------|---------|
| `app/admin/import/page.tsx` | Commissioner import UI |
| `app/my-team/page.tsx` | Team roster view |
| `app/my-team/keepers/page.tsx` | Keeper selection UI |
| `app/draft-board/page.tsx` | Draft board view |

---

## 9. USEFUL COMMANDS

### Database
```bash
# View database in browser
npx prisma studio

# Run migrations
npx prisma migrate dev

# Generate client
npx prisma generate

# Reset database (DESTRUCTIVE)
npx prisma migrate reset
```

### Development
```bash
# Start dev server
npm run dev

# Build
npm run build

# Type check
npx tsc --noEmit
```

### Scripts
```bash
# Run a TypeScript script
npx tsx scripts/your-script.ts
```

---

## 10. BACKUP

A JSON backup was created before the FA wipe:
- File: `backup_before_fa_wipe.json`
- Contains: All tables at time of backup
- Can be used to restore if needed

---

**Document Author:** Claude (Anthropic)
**Session Date:** January 25, 2026
