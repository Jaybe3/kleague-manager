# TASK-601-REDESIGN: Redesign Trade Entry Feature

**Status:** BACKLOG
**Created:** January 2026
**Priority:** Low
**Depends On:** TASK-400
**Phase:** Phase 4 - Admin (Enhancement)
**Type:** Enhancement

---

## Objective

Redesign the manual trade entry form to prevent data corruption and improve UX.

---

## Background

The current trade entry form has UX issues that led to a data corruption incident. Manual player name typing is error-prone, and there's no validation to ensure player names match existing records.

**Data Corruption Incident (January 25, 2026):**
Manual trade entry caused 2 corrupted player records where team name "Chin Music" was accidentally included in player first names:
- "Chin Music Troy Franklin" and "Chin Music Quinshon Judkins" created as duplicate players
- Corrupted records were manually deleted
- Correct TRADE acquisitions were created for the real players

This incident validates the need for player autocomplete/validation in manual entry.

---

## Specification

### Current Issues
- Manual player name typing is error-prone and can corrupt data
- Only handles single player trades, not multi-player trades
- No player search/autocomplete from existing roster
- No validation that player exists before submission

### Proposed Solution

**1. Player Search/Autocomplete**
- Dropdown searches existing players from source team's roster
- Shows player name, position, current keeper cost
- Prevents typos and accidental duplicate creation

**2. Multi-Player Trade Support**
- Support trades like "Player A + Player B for Player C"
- Add/remove players from each side of trade
- Clear visual of what's being traded

**3. Pre-Submission Validation**
- Validate all players exist in database
- Validate players are on specified teams
- Show warning if player recently traded

**4. Trade Preview**
- Show complete trade details before confirming
- Include keeper cost implications
- Require explicit confirmation

---

## Technical Approach

### UI Components Needed
1. Player search component with autocomplete
2. Multi-select for trade parties
3. Trade preview modal
4. Validation feedback display

### API Changes
- May need endpoint to search players by team
- Trade endpoint to accept array of players

### Database
- No schema changes needed
- Transaction wrapper for multi-player trades

---

## Files Created

TBD - likely:
- `components/admin/player-search.tsx`
- `components/admin/trade-builder.tsx`
- `components/admin/trade-preview.tsx`

---

## Files Modified

TBD - likely:
- `app/(dashboard)/admin/import/page.tsx` (trade entry section)
- `app/api/admin/trade/route.ts`
- `lib/importers/index.ts` (`enterTrade()` function)

---

## Acceptance Criteria

- [ ] Player search autocomplete from existing roster
- [ ] Cannot submit trade with non-existent player
- [ ] Support multi-player trades (A + B for C)
- [ ] Trade preview shows before confirmation
- [ ] Validation errors displayed clearly
- [ ] All existing single-player trade functionality preserved
- [ ] No data corruption possible from typos

---

## Verification

TBD - will include:
1. Attempt trade with typo → autocomplete prevents
2. Create multi-player trade → all acquisitions created correctly
3. Preview trade → shows accurate details
4. Cancel from preview → no changes made

---

## Completion Notes

N/A - Not yet started

**Notes:**
- Discovered during TASK-501i testing
- Deprioritized - current import from CBS handles most trade data
- Manual entry is edge case for commissioner corrections
- Data corruption incident adds urgency, but workaround is to be careful

---

## Related

- [TASK-400](../completed/phase-4-admin/TASK-400.md) - Manual Trade Entry (original implementation)
- [TASK-501i](../completed/phase-5-ui/TASK-501i.md) - Restyle Admin Import Page
- [TASK-105](../completed/phase-1-import/TASK-105.md) - Flexible Data Import Parser
