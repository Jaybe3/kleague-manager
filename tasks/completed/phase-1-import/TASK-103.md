# TASK-103: Keeper Cost Rule Corrections

**Status:** COMPLETED
**Created:** January 2026
**Completed:** 2026-01-16 (Calculator), 2026-01-20 (Import Wiring)
**Priority:** High
**Depends On:** TASK-102
**Phase:** Phase 1 - Import

---

## Objective

Implement correct keeper cost calculation rules per 2026-01-14 clarifications.

---

## Background

During testing of the My Team page, it was discovered that the keeper cost calculations had several rule interpretation issues:
1. Year progression was off by one (Y2 was getting reduction instead of Y3)
2. FA lookup wasn't searching all teams for original draft
3. Dropped players were still appearing on roster

This task corrects all rule implementations based on clarifications from the commissioner.

---

## Specification

### Changes Required

1. **Schema Update** - Add `droppedDate` to track when players were dropped
2. **Calculator Fix** - Correct year progression (Y2=base, Y3=first -4)
3. **Service Fix** - Search ALL teams for original DRAFT acquisition
4. **Service Fix** - Filter dropped players from roster display
5. **Test Updates** - Update all test expectations for correct rules
6. **Import Wiring** - Wire up new `lib/keeper` module to replace deprecated `lib/keepers`

### Type Mapping (Old → New)

| Old (`lib/keepers/`) | New (`lib/keeper/`) |
|---------------------|---------------------|
| `getTeamRosterWithKeepers()` | `getTeamRosterWithKeeperCosts()` |
| `RosterWithKeepers` | `TeamRosterWithKeeperCosts` |
| `KeeperCostResult` | `PlayerKeeperCostResult` |

---

## Technical Approach

1. Add `droppedDate` field to PlayerAcquisition schema
2. Fix `YEARS_AT_BASE_COST` from 2 to 1 in calculator
3. Update `getLastEligibleYear` formula
4. Rewrite `findOriginalAcquisition()` to search all teams
5. Add `droppedDate: null` filter to roster queries
6. Update all 23 test cases
7. Wire up new module exports to all app files

---

## Files Created

| File | Purpose |
|------|---------|
| `lib/keepers/DEPRECATED.md` | Migration guide for old module |

---

## Files Modified

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Added `droppedDate` (DateTime?) to PlayerAcquisition |
| `lib/keeper/calculator.ts` | Fixed `YEARS_AT_BASE_COST` from 2 to 1; Y2=base, Y3=first -4 |
| `lib/keeper/types.ts` | Updated type definitions |
| `lib/keeper/service.ts` | `findOriginalAcquisition()` searches ALL teams; filters `droppedDate: null` |
| `lib/keeper/calculator.test.ts` | Updated all 23 test expectations |
| `lib/keeper/index.ts` | Export service functions |
| `app/(dashboard)/my-team/page.tsx` | Import from `@/lib/keeper` |
| `app/api/my-team/route.ts` | Import from `@/lib/keeper` |
| `app/api/teams/[teamId]/roster/route.ts` | Import from `@/lib/keeper` |
| `components/roster/roster-table.tsx` | Use new `PlayerKeeperCostResult` type |

---

## Acceptance Criteria

- [x] Keeper cost uses original draft year/round across all teams
- [x] True undrafted FAs correctly use Round 15 rule
- [x] Dropped players excluded from roster display
- [x] All existing tests pass (23/23)
- [x] All app files import from `@/lib/keeper` (not `@/lib/keepers`)
- [x] TypeScript compiles with no errors
- [x] `lib/keepers/` folder deprecated with migration guide

---

## Verification

```bash
# Run tests
npm test

# Check TypeScript
npx tsc --noEmit

# Verify imports
grep -r "lib/keepers" app/ components/ --include="*.ts" --include="*.tsx"
# Should return no results (all migrated to lib/keeper)
```

---

## Completion Notes

All rule corrections implemented in two phases:

**Phase 1 (2026-01-16): Calculator Fixes**
- Fixed year progression constants
- Updated formula for last eligible year
- All 23 tests updated and passing

**Phase 2 (2026-01-20): Import Wiring**
- Wired new `lib/keeper` module to all app files
- Deprecated old `lib/keepers` folder
- Added migration guide

**TODO (Future):**
- Implement reset scenario detection when multi-year data exists
- Player dropped and not picked up rest of season → re-enters draft pool
- Remove deprecated `lib/keepers/` folder once confirmed no issues

---

## Related

- [TASK-102](./TASK-102.md) - My Team Page (was blocked by this)
- [TASK-103-FINAL](./TASK-103-FINAL.md) - Complete rewrite of acquisition logic
- [TASK-101](./TASK-101.md) - Original calculation engine
