# TASK-201: Keeper Selection Interface

**Status:** COMPLETED
**Created:** January 2026
**Completed:** 2026-01-16
**Priority:** High
**Depends On:** TASK-102, TASK-103
**Includes:** TASK-202 (Keeper Conflict Resolution)
**Phase:** Phase 2 - Keepers

---

## Objective

Allow team managers to select which eligible players to keep for next season, handle round conflicts, and save/finalize selections.

---

## Background

The core user-facing feature of the keeper league system is allowing managers to select their keepers. This involves:
- Viewing eligible players with costs
- Selecting up to a maximum number of keepers
- Handling conflicts when two players have the same round cost
- Saving draft selections
- Finalizing selections before the deadline

This task includes TASK-202 (Keeper Conflict Resolution) which was merged in.

---

## Specification

### Database Changes

Add `maxKeepers` to Season model:
```prisma
model Season {
  // ... existing fields ...
  maxKeepers     Int      @default(3) @map("max_keepers")  // NEW
}
```

### User Flow

1. **View Eligible Players** - Manager sees roster with keeper costs
2. **Select Keepers** - Click to add players (up to maxKeepers)
3. **Handle Conflicts** - If two players at same round, must bump one to EARLIER round
4. **Save Draft** - Can save and return later
5. **Finalize** - Lock selections permanently

### Conflict Resolution (CRITICAL)

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

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/my-team/keepers` | Get selections + eligible players |
| POST | `/api/my-team/keepers/select` | Add player to selections |
| DELETE | `/api/my-team/keepers/select/[playerId]` | Remove player |
| POST | `/api/my-team/keepers/bump` | Bump player to earlier round |
| POST | `/api/my-team/keepers/finalize` | Lock all selections |

---

## Technical Approach

1. Add `maxKeepers` field to Season model
2. Create keeper selection service with business logic
3. Build API endpoints for all CRUD operations
4. Implement conflict detection and bump validation
5. Create UI components for selection interface
6. Add finalization with locking

---

## Files Created

| File | Purpose |
|------|---------|
| `app/(dashboard)/my-team/keepers/page.tsx` | Keeper selection page |
| `app/api/my-team/keepers/route.ts` | GET/POST endpoints |
| `app/api/my-team/keepers/[playerId]/route.ts` | DELETE endpoint |
| `app/api/my-team/keepers/bump/route.ts` | Bump endpoint |
| `app/api/my-team/keepers/finalize/route.ts` | Finalize endpoint |
| `components/keepers/selected-keepers-table.tsx` | Selection display |
| `components/keepers/eligible-players-table.tsx` | Available players |
| `components/keepers/conflict-alert.tsx` | Conflict warning |
| `lib/keeper/selection-service.ts` | Business logic |

---

## Files Modified

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Added `maxKeepers` to Season model |

---

## Acceptance Criteria

- [x] Manager can view all eligible players with keeper costs
- [x] Manager can select up to `maxKeepers` players
- [x] Manager cannot select more than `maxKeepers`
- [x] Round conflicts are detected and highlighted
- [x] Manager can bump a player to EARLIER round to resolve conflicts
- [x] Bump validates new round is available, valid, and < original cost
- [x] Manager can save selections as draft
- [x] Manager can remove players from selections
- [x] Manager can finalize selections (locks them)
- [x] Finalized selections cannot be modified
- [x] Commissioner can configure `maxKeepers` per season
- [x] All API endpoints validate user owns the team

---

## Verification

### Manual Testing
1. Log in as team manager
2. Navigate to `/my-team/keepers`
3. View eligible players list
4. Select up to 3 keepers
5. Trigger a conflict by selecting two players at same round
6. Use bump feature to resolve conflict
7. Save draft selections
8. Finalize selections
9. Verify cannot modify after finalization

### API Testing
```bash
# Get keepers and eligible players
curl http://localhost:3000/api/my-team/keepers

# Select a player
curl -X POST http://localhost:3000/api/my-team/keepers/select -d '{"playerId": "..."}'

# Bump a player
curl -X POST http://localhost:3000/api/my-team/keepers/bump -d '{"playerId": "...", "newRound": 5}'

# Finalize
curl -X POST http://localhost:3000/api/my-team/keepers/finalize
```

---

## Completion Notes

Full keeper selection interface implemented with all features:
- View eligible players with costs
- Select up to maxKeepers
- Conflict detection and bump resolution
- Draft saving and finalization
- Proper validation on all endpoints

TASK-202 (Keeper Conflict Resolution) was merged into this task as it was closely related functionality.

---

## Related

- [TASK-102](../phase-1-import/TASK-102.md) - My Team Page (prerequisite)
- [TASK-103](../phase-1-import/TASK-103.md) - Keeper Cost Rule Corrections (prerequisite)
- [TASK-203](./TASK-203.md) - Deadline Enforcement (depends on this)
- [TASK-300](../phase-3-draft-board/TASK-300.md) - Draft Board Grid Display (uses finalized selections)
- [BUG-001](../../bugs/BUG-001.md) - Round Conflict Not Showing Error (found during this task)
