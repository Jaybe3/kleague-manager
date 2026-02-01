# TASK-600d: Slot-Centric Cleanup (Technical Debt)

**Status:** BACKLOG
**Created:** January 2026
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

TBD

---

## Files Modified

TBD - likely:
- `lib/keeper/selection-service.ts` - slotId refactor
- `lib/importers/draft-importer.ts` - TeamAlias auto-create
- `lib/importers/transaction-importer.ts` - TeamAlias auto-create
- `lib/importers/index.ts` - Draft order validation

---

## Acceptance Criteria

- [ ] Refactor `lib/keeper/selection-service.ts` to use slotId as primary parameter instead of teamId
- [ ] Importer auto-creates TeamAlias for unknown team names (using draft position to resolve slot)
- [ ] Importer validates draft order exists before import and fails with clear error if not
- [ ] All existing tests pass
- [ ] No user-facing changes (internal refactor only)

---

## Verification

TBD - will include:
```bash
# Run all tests
npm test

# Manual testing:
# 1. Import with unknown team name → TeamAlias auto-created
# 2. Import without draft order → Clear error message
# 3. All keeper functionality still works
```

---

## Completion Notes

N/A - Not yet started

**Notes:**
- None of these block current functionality
- Can be addressed when convenient or if edge cases arise
- Low risk of issues since workarounds are documented

---

## Related

- [TASK-600c](../completed/phase-6-refactor/TASK-600c.md) - Code Migration (prerequisite, where items were deferred)
- [TASK-600a](../completed/phase-6-refactor/TASK-600a.md) - Schema Additions
- [TASK-600b](../completed/phase-6-refactor/TASK-600b.md) - Data Backfill
- [TASK-104](../completed/phase-1-import/TASK-104.md) - Team Identity System (Slots)
