# TASK-600: Backfill Historical Keeper Selections

**Status:** BACKLOG
**Created:** January 2026
**Priority:** Low
**Depends On:** N/A
**Phase:** Phase 6 - Refactor (Data Enhancement)

---

## Objective

Populate keeper_selections table with historical data for 2024 and 2025 seasons so draft board shows past keepers.

---

## Background

The Draft Board correctly queries the keeper_selections table, but only 2026 has data (from current keeper selection workflow). The 2024 and 2025 seasons show empty draft boards because no keeper_selections records exist for those years.

This was discovered during TASK-501h (Draft Board restyle) when testing the season selector.

---

## Specification

### Current State
- Draft board queries `keeper_selections` table
- Only 2026 has data (currently 3 finalized keepers)
- 2024/2025 show empty because no `keeper_selections` records exist
- Historical keeper data exists somewhere (Excel spreadsheets? CBS exports? Commissioner memory?)

### Requirements
1. Identify source of historical keeper data
   - Excel spreadsheets from previous seasons?
   - CBS Sports transaction history?
   - Commissioner manual records?

2. Create import process
   - Script to parse historical data
   - Create KeeperSelection records with correct:
     - playerId (match to existing Player records)
     - teamId (match to existing Team records)
     - slotId (derive from team)
     - seasonYear (2024 or 2025)
     - keeperRound (from historical data)
     - status (FINALIZED for historical)

3. Verify accuracy
   - Cross-reference with draft results
   - Players kept should not appear in FA pool for that round

---

## Technical Approach

TBD - depends on data source identified

Likely approach:
1. Get historical keeper data from commissioner
2. Create script similar to `scripts/backfill-slot-ids.ts`
3. Parse data and create KeeperSelection records
4. Verify against draft board display

---

## Files Created

TBD - likely:
- `scripts/backfill-keeper-selections.ts`

---

## Files Modified

TBD

---

## Acceptance Criteria

- [ ] Identify source of 2024 keeper decisions
- [ ] Identify source of 2025 keeper decisions
- [ ] Create script or import process to backfill data
- [ ] Draft board displays keepers for 2024 season
- [ ] Draft board displays keepers for 2025 season
- [ ] Historical data matches actual keeper decisions
- [ ] Script is idempotent (safe to run multiple times)

---

## Verification

TBD - will include:
```bash
# Run backfill script
npx tsx scripts/backfill-keeper-selections.ts

# Verify counts
npx tsx -e "import { db } from './lib/db';
db.keeperSelection.groupBy({ by: ['seasonYear'], _count: true }).then(console.log)"
# Expected: 2024 and 2025 have records

# Visual verification
# 1. Navigate to /draft-board
# 2. Select 2024 from dropdown
# 3. Verify keeper cells display correctly
# 4. Select 2025, verify same
```

---

## Completion Notes

N/A - Not yet started

**Notes:**
- This is cosmetic/historical completeness, not blocking any functionality
- Current users can select keepers for 2026 without this
- Can be addressed when convenient

---

## Related

- [TASK-501h](../completed/phase-5-ui/TASK-501h.md) - Restyle Draft Board Page (where issue was discovered)
- [TASK-300](../completed/phase-3-draft-board/TASK-300.md) - Draft Board Grid Display
- [TASK-201](../completed/phase-2-keepers/TASK-201.md) - Keeper Selection Interface
