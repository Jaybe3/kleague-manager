# TASK-600d: Slot-Centric Cleanup (Technical Debt)

**Status:** COMPLETED
**Created:** January 2026
**Started:** February 2, 2026
**Completed:** February 2, 2026
**Priority:** Low
**Depends On:** TASK-600c
**Phase:** Phase 6 - Schema Refactor (Technical Debt)

---

## Objective

Complete remaining slot migration items deferred from TASK-600c. These are low-priority architectural improvements that have functional workarounds in place.

---

## Background

TASK-600c achieved core functionality (BUG-002 fixed, draft order/keepers/draft board work for future seasons). However, some items were deferred because they had working workarounds and weren't blocking user workflows.

These items are technical debt cleanup - good to fix for code cleanliness, but not urgent.

---

## Specification

### Deferred Items

**1. Keeper Service teamId Parameter**
- Current: `lib/keeper/selection-service.ts` uses `teamId` as primary parameter
- Target: Refactor to use `slotId` as primary parameter
- Workaround: `team-initializer.ts` creates Team records as needed, so `teamId` is always available

**2. Importer TeamAlias Auto-Create**
- Current: Importer doesn't auto-create TeamAlias for unknown team names
- Target: Use draft position to resolve slot and create alias automatically
- Workaround: Manually add aliases via database before importing new team names

**3. Importer Draft Order Validation**
- Current: Importer doesn't validate draft order exists before import
- Target: Fail with clear error if draft order not set for season
- Workaround: Ensure draft order is set before running import (manual step)

---

## Technical Approach

### 1. Keeper Service Refactor
```typescript
// Before: teamId is primary identifier
async function getTeamKeeperSelections(teamId: string, seasonYear: number)

// After: slotId is primary identifier
async function getSlotKeeperSelections(slotId: number, seasonYear: number)
```

### 2. TeamAlias Auto-Create
```typescript
// In draft-importer.ts, when team name not found:
// 1. Look up draft position from import data
// 2. Find slot with matching position in DraftOrder
// 3. Create TeamAlias linking name to slot
// 4. Continue with import
```

### 3. Draft Order Validation
```typescript
// At start of import:
const draftOrders = await db.draftOrder.findMany({
  where: { seasonYear }
});
if (draftOrders.length !== 10) {
  throw new Error(`Draft order not set for ${seasonYear}. Set draft order before importing.`);
}
```

---

## Files Created

| File | Purpose |
|------|---------|
| N/A | No new files created |

---

## Files Modified

| File | Change |
|------|--------|
| `lib/keeper/selection-service.ts` | Added `getSlotKeeperSelections()` as primary function, deprecated `getTeamKeeperSelections()` |
| `lib/importers/index.ts` | Added `validateDraftOrderExists()` helper, added validation to `importDraftFromText()` and `importDraftData()` |
| `lib/importers/team-mapper.ts` | Added `resolveTeamSlotWithAutoAlias()` to auto-create aliases from draft position |
| `lib/importers/draft-importer.ts` | Updated `importDraftPicks()` to use auto-alias resolution instead of erroring on unknown teams |
| `app/api/my-team/keepers/route.ts` | Updated to use `getSlotKeeperSelections()` instead of `getTeamKeeperSelections()` |

---

## Acceptance Criteria

- [x] Refactor `lib/keeper/selection-service.ts` to use slotId as primary parameter instead of teamId
- [x] Importer auto-creates TeamAlias for unknown team names (using draft position to resolve slot)
- [x] Importer validates draft order exists before import and fails with clear error if not
- [x] All existing tests pass
- [x] No user-facing changes (internal refactor only)

---

## Verification

```bash
# Type check and build
npx tsc --noEmit && npm run build

# Manual testing:
# 1. Import with unknown team name → TeamAlias auto-created (warning shown)
# 2. Import without draft order → Clear error: "Draft order not set for {year}"
# 3. All keeper functionality still works via My Team > Keepers
```

---

## Completion Notes

### Item 1: Keeper Service Refactor
- Added `getSlotKeeperSelections(slotId, targetYear)` as the new primary function
- Internally derives `rosterYear = targetYear - 1` and looks up Team
- Marked `getTeamKeeperSelections()` as `@deprecated` - both delegate to shared internal function
- Updated `/api/my-team/keepers` route to use new function

### Item 2: TeamAlias Auto-Create
- Added `resolveTeamSlotWithAutoAlias(teamName, draftPosition, seasonYear)` in team-mapper.ts
- Looks up DraftOrder to find slot for unknown team names
- Auto-creates TeamAlias with `validFrom = seasonYear`
- Reports auto-created aliases in import warnings

### Item 3: Draft Order Validation
- Added `validateDraftOrderExists(seasonYear)` helper in importers/index.ts
- Checks for exactly 10 draft order entries before import
- Clear error messages for missing/incomplete draft order
- Applied to both `importDraftFromText()` and `importDraftData()`

### Notes
- All changes are internal refactors with no user-facing changes
- Removes manual workarounds previously required for team renames
- Improves import error messages and developer experience

---

## Related

- [TASK-600c](../completed/phase-6-refactor/TASK-600c.md) - Code Migration (prerequisite, where items were deferred)
- [TASK-600a](../completed/phase-6-refactor/TASK-600a.md) - Schema Additions
- [TASK-600b](../completed/phase-6-refactor/TASK-600b.md) - Data Backfill
- [TASK-104](../completed/phase-1-import/TASK-104.md) - Team Identity System (Slots)
