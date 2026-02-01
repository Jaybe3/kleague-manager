# TASK-301: Draft Board with Draft Order Management

**Status:** COMPLETED
**Created:** January 2026
**Completed:** 2026-01-21
**Priority:** High
**Depends On:** TASK-300
**Phase:** Phase 3 - Draft Board

---

## Objective

Enable commissioner to set draft order for each season, and display the Draft Board sorted by draft position showing keepers and open slots.

---

## Background

The draft board needs to display teams in their actual draft order, not just by slot number. The commissioner needs to be able to:
- Set the draft order for each season (positions 1-10)
- Update the order as needed
- See the board reflect the actual draft sequence

---

## Specification

### Commissioner Features
- Admin page to set draft order
- Assign positions 1-10 to each team
- Prevent duplicate positions
- Save to database (Team.draftPosition)

### Draft Board Updates
- Display teams in draft order (not slot order)
- Column headers show "Pick X" with team name
- Season selector dropdown

---

## Technical Approach

1. Create admin draft order page
2. Build API endpoints for GET/PUT draft order
3. Update draft board API to sort by draftPosition
4. Update grid component for new column headers
5. Add season selector to draft board page

---

## Files Created

| File | Purpose |
|------|---------|
| `app/(dashboard)/admin/draft-order/page.tsx` | Admin UI for setting draft order |
| `app/api/admin/draft-order/route.ts` | GET/PUT endpoints for draft order |

---

## Files Modified

| File | Change |
|------|--------|
| `app/api/draft-board/route.ts` | Sort teams by draftPosition, add season selector |
| `lib/draft-board/types.ts` | Added draftPosition to DraftBoardTeam, availableSeasons to response |
| `components/draft-board/draft-board-grid.tsx` | Column headers show "Pick X" with team name |
| `components/draft-board/draft-board-cell.tsx` | Empty cells show "—" instead of blank |
| `app/(dashboard)/draft-board/page.tsx` | Added season selector dropdown |

---

## Acceptance Criteria

- [x] Commissioner can access draft order admin page
- [x] Commissioner can set pick positions 1-10 for each team
- [x] Validation prevents duplicate positions
- [x] Draft order saves to database (Team.draftPosition)
- [x] Draft Board displays teams in draft order (not slot order)
- [x] Draft Board shows finalized keepers in correct cells
- [x] Draft Board shows open slots for non-keeper rounds
- [x] Non-commissioners cannot access admin draft order page (403)

---

## Verification

### Admin Testing
1. Log in as commissioner
2. Navigate to `/admin/draft-order`
3. Select season from dropdown
4. Assign positions 1-10 to teams
5. Try to assign duplicate position → error
6. Save and verify persistence

### Draft Board Testing
1. Navigate to `/draft-board`
2. Verify teams displayed in draft order
3. Verify column headers show "Pick 1", "Pick 2", etc.
4. Change season in dropdown
5. Verify data updates correctly

---

## Bug Fixes During Implementation

### 1. Season dropdown empty on /admin/draft-order
- **Cause:** API defaulted to latest Season record (2026) which had no teams
- **Fix:** Query `Team.groupBy` to find seasons that actually have teams, default to latest with data

### 2. Draft board defaults to 2027 with no data
- **Cause:** Active season is 2026, targetYear = 2026 + 1 = 2027
- **Fix:** Same approach - find seasons with teams for dropdown, default to latest with data

### 3. Grid hidden when 0 keepers
- **Cause:** Conditional rendering showed message instead of grid structure
- **Fix:** Always show grid with empty cells, only hide if no teams exist

### 4. /my-team/keepers shows "No team found"
- **Cause:** All keepers API routes looked for team where `seasonYear = active season (2026)`, but user only had teams for 2023-2025
- **Fix:** Changed all keepers API routes to find user's most recent team regardless of season
- **Files fixed:**
  - `app/api/my-team/keepers/route.ts` (GET and POST)
  - `app/api/my-team/keepers/[playerId]/route.ts` (DELETE)
  - `app/api/my-team/keepers/bump/route.ts` (GET and POST)
  - `app/api/my-team/keepers/finalize/route.ts` (POST)

---

## Completion Notes

Draft order management fully implemented. Key learnings:
- Season selector must only show seasons with actual team data
- Draft board should always show grid structure even with 0 keepers
- Keeper routes need flexible team lookup (not tied to active season)

---

## Related

- [TASK-300](./TASK-300.md) - Draft Board Grid Display (prerequisite)
- [TASK-501j](../phase-5-ui/TASK-501j.md) - Restyle Admin Draft Order Page
- [BUG-002](../../bugs/BUG-002.md) - Cannot Set Draft Order for Future Season
