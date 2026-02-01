# TASK-600c: Code Migration - Use slotId Instead of teamId

**Status:** COMPLETED (scope adjusted)
**Created:** January 2026
**Completed:** January 25, 2026
**Priority:** High
**Depends On:** TASK-600b
**Phase:** Phase 6 - Schema Refactor

---

## Objective

Update all application code to query by `slotId` instead of `teamId`. Update draft order management to use DraftOrder table. Enable draft order and keeper selection for future seasons (fixes BUG-002).

---

## Background

With the schema additions (TASK-600a) and data backfill (TASK-600b) complete, the application code needed to be updated to use the slot-centric model. This enables the pre-draft workflow where commissioners can set draft order and managers can select keepers before draft data is imported.

---

## Specification

### Key Logic Changes

1. **Finding User's Slot:** Query `TeamSlot.managerId` instead of `Team.managerId`
2. **Getting Team Name:** Create helper to query `TeamAlias` by `slotId` + `seasonYear`
3. **Draft Order:** Use `DraftOrder` table; auto-create for new seasons by copying previous
4. **Keeper Queries:** Query `PlayerAcquisition` by `slotId`, not `teamId`
5. **Importer Updates:** Resolve unknown team names via `DraftOrder` position

### Progress (January 25, 2026)

- Created `lib/slots/team-initializer.ts` with `initializeTeamsForSeason()` and `ensureTeamForSlot()`
- Updated `app/api/my-team/keepers/route.ts` to use slot-based lookup and auto-create teams
- Tested: 10 teams created for 2026 season from slot data (teamName from TeamAlias, draftPosition from DraftOrder)
- Verified idempotency: second run creates 0 teams, reports 10 existed
- **BUG-002 FIXED:** Keeper selection now works for future seasons by auto-creating Team records

---

## Technical Approach

1. Create `lib/slots/team-initializer.ts` with team initialization functions
2. Create slot helper functions in `lib/slots/index.ts`
3. Create draft order service for DraftOrder CRUD + auto-create logic
4. Update keeper routes to use slot-based lookup
5. Update draft board to use DraftOrder + TeamAlias
6. Update importers to write slotId on all new acquisitions

---

## Files Created

| File | Purpose |
|------|---------|
| `lib/slots/team-initializer.ts` | Team initialization from slot data |
| `lib/slots/index.ts` | Slot helper functions |
| `lib/slots/draft-order-service.ts` | Draft order CRUD + auto-create logic |

---

## Files Modified

| File | Change |
|------|--------|
| `lib/keeper/service.ts` | Query by slotId |
| `lib/keeper/selection-service.ts` | Use slotId for selections |
| `lib/keeper/db.ts` | Update queries |
| `lib/importers/draft-importer.ts` | Write slotId, auto-create TeamAlias |
| `lib/importers/transaction-importer.ts` | Write slotId |
| `lib/importers/team-mapper.ts` | Add DraftOrder-based resolution |
| `app/api/my-team/keepers/route.ts` | Find slot via TeamSlot.managerId |
| `app/api/my-team/keepers/[playerId]/route.ts` | Use slotId |
| `app/api/my-team/keepers/bump/route.ts` | Use slotId |
| `app/api/my-team/keepers/finalize/route.ts` | Use slotId |
| `app/api/admin/draft-order/route.ts` | Use DraftOrder table |
| `app/api/admin/keeper-overrides/route.ts` | Use slotId |
| `app/api/draft-board/route.ts` | Query DraftOrder + TeamAlias |

---

## Acceptance Criteria

- [ ] All keeper service queries use slotId (still uses teamId as primary - deferred)
- [x] All keeper selection APIs work with slotId (via team-initializer, TASK-700)
- [x] Draft order page works for 2026 (teams auto-created)
- [x] Draft order auto-copies from previous season if none exists
- [x] Draft board displays correctly using DraftOrder + TeamAlias (verified Jan 25)
- [x] Importer writes slotId on all new acquisitions (verified: slotId populated)
- [ ] Importer auto-creates TeamAlias for unknown names (deferred to TASK-600d)
- [ ] Importer fails with clear error if draft order not set (deferred to TASK-600d)
- [x] TypeScript compiles without errors
- [x] All existing functionality still works

---

## Verification

### Verification Commands
```bash
# TypeScript compilation
npx tsc --noEmit

# Run tests
npm test

# Manual verification:
# 1. Go to /admin/draft-order, select 2026, verify UI works
# 2. Go to /my-team/keepers, verify roster displays
# 3. Go to /draft-board, verify board displays correctly
```

---

## Completion Notes

Completed January 25, 2026. Core functionality achieved: draft order, keeper selection, and draft board all work for future seasons (2026+) via slot-centric architecture. BUG-002 fixed.

Three low-priority items deferred to TASK-600d:
1. Keeper service still uses teamId as function parameter (functional workaround: team-initializer creates teams as needed)
2. Importer doesn't auto-create TeamAlias for unknown names (workaround: manually add aliases before import)
3. Importer doesn't validate draft order exists (workaround: ensure draft order set before importing)

This is the largest task in Phase 6 - updates many files. Implementation order: Create new lib/slots/ files first, then update lib/keeper/, then lib/importers/, then API routes.

Team table remains for backward compatibility but is no longer the primary reference. After this task, slotId columns can be made required (TASK-600d).

---

## Related

- [TASK-600a](./TASK-600a.md) - Schema Additions (prerequisite)
- [TASK-600b](./TASK-600b.md) - Data Backfill (prerequisite)
- [TASK-700](./TASK-700.md) - Initialize Teams for Future Seasons (extracted from this task)
- [BUG-002](../../bugs/BUG-002.md) - Cannot Set Draft Order for Future Season (fixed by this)
