# TASK-501b: Keepers Page Performance

**Status:** COMPLETED
**Created:** January 2026
**Completed:** January 25, 2026
**Priority:** High (was Low)
**Depends On:** TASK-501d
**Phase:** Phase 5 - UI/UX Polish

---

## Objective

Fix N+1 query performance issue on Keepers page that was causing ~168 database queries per page load.

---

## Background

The Keepers page was too slow to use due to an N+1 query pattern. Each player's keeper cost calculation triggered multiple individual database queries, resulting in ~168 queries for a typical roster view. This made the page feel sluggish and unresponsive.

Originally logged as a Low priority backlog item during TASK-501d (noted as "Pre-existing slow load on Keepers/My Team pages noted for future optimization"). Elevated to High priority when it became clear the performance was significantly impacting user experience.

---

## Specification

### Problem Analysis
- Each call to `getPlayerKeeperCost()` made individual database queries:
  - Rule flags lookup (per player)
  - This-slot acquisitions (per player)
  - Cross-slot drafts for TRADEs (per player)
  - Cross-slot same-season drafts for FAs (per player)
  - Override lookup (per player)

### Solution Requirements
- Create batch function to calculate keeper costs for multiple players at once
- Fetch rule flags ONCE for all players
- Batch all acquisition queries
- Process calculations in memory
- Reduce query count by 95%+

### Additional Bug Fixes Identified
1. **Cascade Bug:** All keeper routes using inconsistent season lookup patterns
2. **Override Lookup Bug:** Using most recent team instead of roster team for overrides

---

## Technical Approach

1. Create `getPlayerKeeperCostsBatch()` function in `lib/keeper/service.ts`
2. Fetch rule flags once at the start
3. Batch this-slot acquisitions (active + historical) in single query
4. Batch cross-slot drafts for TRADEs (conditional) in single query
5. Batch cross-slot same-season drafts for 2025+ FAs (conditional) in single query
6. Batch override lookups in single query
7. Process calculations in memory using fetched data
8. Fix cascade bug in all keeper routes (consistent active season pattern)
9. Fix override lookup to use correct roster team

---

## Files Created

None

---

## Files Modified

| File | Change |
|------|--------|
| `lib/keeper/service.ts` | Added `getPlayerKeeperCostsBatch()`, `findKeeperBaseFromData()`, fixed override lookup |
| `lib/keeper/selection-service.ts` | Updated `getTeamKeeperSelections()` to use batch function |
| `app/api/my-team/keepers/route.ts` | Fixed cascade bug with consistent active season pattern |
| `app/api/my-team/keepers/bump/route.ts` | Fixed cascade bug with consistent active season pattern |
| `app/api/my-team/keepers/[playerId]/route.ts` | Fixed cascade bug with consistent active season pattern |
| `app/api/my-team/keepers/finalize/route.ts` | Fixed cascade bug with consistent active season pattern |

---

## Acceptance Criteria

- [x] Keepers page loads in reasonable time (<2 seconds)
- [x] Query count reduced from ~168 to ~9-11 (95% reduction)
- [x] Keeper cost calculations remain accurate
- [x] Cascade bug fixed in all keeper routes
- [x] Override lookup uses correct roster team
- [x] No TypeScript errors
- [x] All keeper functionality still works (select, remove, bump, finalize)

---

## Verification

### Performance Testing
```bash
# Enable Prisma query logging in .env
DATABASE_URL="file:./dev.db"
# Check server console for query count during page load
```

### Functional Testing
1. Navigate to `/my-team/keepers`
2. Verify page loads quickly
3. Verify keeper costs display correctly
4. Test select, remove, bump, finalize actions
5. Verify all operations work correctly

---

## Completion Notes

Query reduction achieved: ~168 queries → ~9-11 queries (95% reduction)

Key implementation decisions:
- Used `findKeeperBaseFromData()` helper to process pre-fetched data instead of individual queries
- Batch function accepts array of player IDs and returns Map of results
- Conditional cross-slot queries only execute when needed (TRADEs or 2025+ FAs)

The cascade bug was also fixed across all keeper routes by ensuring consistent use of the active season anchoring pattern. This prevents issues where routes were looking at different seasons.

---

## Related

- [TASK-501d](./TASK-501d.md) - UI Foundation (where performance issue was first noted)
- [TASK-501c](./TASK-501c.md) - Keeper Override Performance (fixed via this task)
- [TASK-103-FINAL](../phase-1-import/TASK-103-FINAL.md) - Keeper Acquisition Logic (original implementation)
