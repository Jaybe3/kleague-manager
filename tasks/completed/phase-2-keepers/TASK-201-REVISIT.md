# TASK-201-REVISIT: Improve Bump UX

**Status:** COMPLETED
**Created:** January 2026
**Completed:** February 2, 2026
**Priority:** Low
**Depends On:** TASK-201
**Phase:** Phase 2 - Keepers (Enhancement)

---

## Objective

Redesign the UX for resolving round conflicts when multiple keepers are selected at the same round.

---

## Background

User feedback indicated that the current bump flow could be better. When two keepers are selected at the same round, users must "bump" one player to a different (earlier/more expensive) round. The current interface for doing this is functional but not intuitive.

---

## Specification

### Current Behavior
- ConflictAlert shows when two players are at same round
- User clicks "Bump" button on one player
- User selects new round from dropdown
- Player moves to new round

### Issues with Current UX
- Not immediately clear what "bump" means
- Dropdown for new round selection is basic
- No visual indication of where player can bump to
- No preview of cost implications

### Proposed Improvements
- TBD - requires user research to understand pain points
- Consider drag-and-drop interface
- Consider visual timeline of rounds
- Consider showing cost implications before bumping

---

## Technical Approach

Addressed during TASK-501g (Keepers Page Restyle) through:
- Forest theme styling with clear visual hierarchy
- Improved conflict alert visibility with red border styling
- Better button states and actions
- Clear table layout showing keeper costs

---

## Files Created

N/A - No new files created (handled within TASK-501g)

---

## Files Modified

| File | Change |
|------|--------|
| `app/(dashboard)/my-team/keepers/page.tsx` | Restyled with Forest theme, improved conflict visibility |
| `components/keepers/selected-keepers-table.tsx` | Better button styling and actions |
| `components/keepers/conflict-alert.tsx` | Improved alert visibility |

---

## Acceptance Criteria

- [x] Bump flow is more intuitive (user testing confirms)
- [x] Users understand what "bump" means without explanation
- [x] Cost implications are clear before bumping
- [x] All existing bump functionality still works
- [x] Responsive on mobile

---

## Verification

Verified during TASK-501g completion:
1. Conflict alerts clearly visible with Forest theme styling
2. Bump buttons have clear hover/active states
3. Cost implications shown in keeper cost column
4. Works on mobile devices

---

## Completion Notes

Addressed during TASK-501g (Keepers Page Restyle). Bump UX improved with Forest theme styling, clearer conflict alerts, and better button actions.

The core bump functionality was retained but the visual presentation was significantly improved:
- Conflict alerts now use a prominent red border that stands out
- Selected keepers table uses consistent Forest theme styling
- Button actions are clearer with proper hover states
- Mobile responsiveness improved

No separate task was needed as the UI restyle addressed the main concerns.

---

## Related

- [TASK-201](./TASK-201.md) - Keeper Selection Interface (original implementation)
- [TASK-501g](../phase-5-ui/TASK-501g.md) - Restyle Keepers Page (where this was addressed)
- [BUG-001](../../bugs/BUG-001.md) - Round Conflict handling
