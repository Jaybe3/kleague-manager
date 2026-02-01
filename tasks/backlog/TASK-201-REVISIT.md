# TASK-201-REVISIT: Improve Bump UX

**Status:** BACKLOG
**Created:** January 2026
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

TBD - depends on UX design decisions

---

## Files Created

TBD

---

## Files Modified

TBD - likely:
- `components/keepers/selected-keepers-table.tsx`
- `components/keepers/conflict-alert.tsx`
- Possibly new component for bump interface

---

## Acceptance Criteria

- [ ] Bump flow is more intuitive (user testing confirms)
- [ ] Users understand what "bump" means without explanation
- [ ] Cost implications are clear before bumping
- [ ] All existing bump functionality still works
- [ ] Responsive on mobile

---

## Verification

TBD - will include user testing

---

## Completion Notes

N/A - Not yet started

---

## Related

- [TASK-201](../completed/phase-2-keepers/TASK-201.md) - Keeper Selection Interface (original implementation)
- [TASK-501g](../completed/phase-5-ui/TASK-501g.md) - Restyle Keepers Page
- [BUG-001](../bugs/BUG-001.md) - Round Conflict handling
