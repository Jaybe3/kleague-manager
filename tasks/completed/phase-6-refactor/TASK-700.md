# TASK-700: Initialize Teams for Future Seasons

**Status:** COMPLETED
**Created:** January 2026
**Completed:** January 25, 2026
**Priority:** High
**Depends On:** TASK-600c
**Phase:** Phase 6 - Slot-Centric Refactor
**Fixes:** BUG-002

---

## Objective

Create Team records automatically from slot data when needed, enabling keeper selection and draft preparation for future seasons before draft import.

---

## Background

KeeperSelection requires Team records, but Teams only exist after draft import. This blocked the pre-draft workflow (setting draft order, selecting keepers for 2026). The solution is to auto-create Team records from slot data when needed.

---

## Specification

### Problem

The existing system had a chicken-and-egg problem:
1. Teams are created when draft data is imported
2. Draft data is imported AFTER the draft happens
3. Keeper selection needs to happen BEFORE the draft
4. But keeper selection requires Team records to exist

### Solution

Create `lib/slots/team-initializer.ts` with:
- `initializeTeamsForSeason(year)` - Creates all 10 Team records from slot data
- `ensureTeamForSlot(slotId, year)` - Ensures a specific team exists

### Data Sources

| Team Field | Source |
|------------|--------|
| `teamName` | from `TeamAlias` (current name where validTo IS NULL) |
| `draftPosition` | from `DraftOrder` table (auto-created if needed) |
| `managerId` | from `TeamSlot.managerId` (current slot owner) |

---

## Technical Approach

1. Create `lib/slots/team-initializer.ts` with initialization functions
2. Query TeamAlias for current team name for each slot
3. Query DraftOrder for draft position (auto-copy from previous season if needed)
4. Query TeamSlot for manager assignment
5. Create Team record with all fields populated
6. Make functions idempotent (safe to call multiple times)
7. Update keeper routes to use slot-based lookup and auto-create teams

---

## Files Created

| File | Purpose |
|------|---------|
| `lib/slots/team-initializer.ts` | Team initialization from slot data |

---

## Files Modified

| File | Change |
|------|--------|
| `app/api/my-team/keepers/route.ts` | Now uses slot-based lookup and auto-creates teams |

---

## Acceptance Criteria

- [x] Teams auto-created for 2026 season (10 teams)
- [x] Team names sourced from TeamAlias
- [x] Draft positions sourced from DraftOrder
- [x] Manager IDs inherited from TeamSlot
- [x] Idempotent (second run creates 0 teams)
- [x] TypeScript compiles without errors
- [x] Keeper selection API works for future seasons

---

## Verification

### Verification Commands

```bash
# Verify 2026 teams exist
npx tsx -e "import { db } from './lib/db'; db.team.count({ where: { seasonYear: 2026 } }).then(console.log)"
# Expected: 10
```

### Manual Testing

1. Navigate to `/admin/draft-order`, select 2026
2. Verify teams display with names and positions
3. Navigate to `/my-team/keepers`
4. Verify roster displays correctly
5. Select a keeper and verify it saves

---

## Completion Notes

Completed January 25, 2026. Created team-initializer.ts, updated keepers API route.

Tested:
- 10 teams created for 2026 with correct names and draft positions
- Idempotency verified (second run reports 10 teams already existed, creates 0)
- BUG-002 now fixed

### Cascade Bug Fix (January 25, 2026)

Original implementation had a bug where the keepers route used "most recent team" logic combined with `ensureTeamForSlot()`, causing infinite team creation (2027, 2028, ... up to 2032+).

Fixed by anchoring to active season instead:
- GET handler: Uses `activeSeason.year` to determine target/roster years
- POST handler: Same fix - uses active season, not "most recent team"
- Cleaned up 60 runaway teams created during bug occurrence

This pattern is documented in `.clinerules` as the "Keeper Route Pattern" to prevent future cascade bugs.

---

## Related

- [TASK-600c](./TASK-600c.md) - Code Migration (this was extracted from 600c)
- [BUG-002](../../bugs/BUG-002.md) - Cannot Set Draft Order for Future Season (fixed)
- [TASK-104](../phase-1-import/TASK-104.md) - Team Identity System (Slots)
