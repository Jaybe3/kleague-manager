# TASK-601-REDESIGN: Redesign Trade Entry Feature

**Status:** COMPLETE
**Created:** January 2026
**Started:** February 2, 2026
**Completed:** February 2, 2026
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
- New endpoint to search players by team roster
- Trade endpoint accepts array of players per side
- Transaction-wrapped multi-player trades

### Database
- No schema changes needed
- Transaction wrapper for multi-player trades

---

## Files Created

- `app/api/admin/trade/roster/route.ts` - Player search API for team rosters
- `components/admin/player-search.tsx` - Autocomplete search component
- `components/admin/trade-builder.tsx` - Two-sided trade interface
- `components/admin/trade-preview.tsx` - Confirmation panel

---

## Files Modified

- `app/(dashboard)/admin/import/page.tsx` - Replaced TradeSection with new components
- `app/api/admin/trade/route.ts` - Updated for multi-player trade support

---

## Acceptance Criteria

- [x] Player search autocomplete from existing roster
- [x] Cannot submit trade with non-existent player
- [x] Support multi-player trades (A + B for C)
- [x] Trade preview shows before confirmation
- [x] Validation errors displayed clearly
- [x] All existing single-player trade functionality preserved
- [x] No data corruption possible from typos

---

## Verification

1. Attempt trade with typo - impossible with autocomplete (only roster players selectable)
2. Create multi-player trade - transaction wraps all operations
3. Preview trade - shows player details, keeper costs, warning
4. Cancel from preview - returns to builder, no changes made

---

## Completion Notes

Implemented via 6-step incremental approach:

1. **Step 1:** Created `/api/admin/trade/roster` endpoint for roster search
   - Returns players with keeperCost, isKeeperEligible, acquisitionType, draftRound
   - Filters by slotId and optional search query

2. **Step 2:** Created `PlayerSearch` component
   - 300ms debounced search
   - Keyboard navigation (arrow keys, enter, escape)
   - Shows position badge and keeper cost badge
   - Supports excluding already-selected players

3. **Step 3:** Created `TradeBuilder` component
   - Two-sided interface (Team A ↔ Team B)
   - Team selection filters available players
   - Add/remove players from each side
   - Trade date picker, Preview/Reset buttons

4. **Step 4:** Created `TradePreview` component
   - Shows complete trade summary
   - Displays player details and keeper costs
   - Warning: "This action cannot be undone"
   - Confirm/Cancel buttons with loading state

5. **Step 5:** Updated trade API for multi-player support
   - New request body: `{ teamA: {slotId, playerIds[]}, teamB: {slotId, playerIds[]} }`
   - Prisma transaction wraps all operations
   - Returns detailed trade summary

6. **Step 6:** Wired components into admin import page
   - Replaced old TradeSection with new components
   - Season selector auto-loads teams
   - Smooth flow: Builder → Preview → Success/Error

**Key Features:**
- Player selection via autocomplete prevents typos
- Multi-player trades: any combination (1:1, 4:2, 3:1, etc.)
- Players inherit original draft round for keeper cost
- Transaction ensures all-or-nothing execution
- Preview step prevents accidental submissions

---

## Related

- [TASK-400](../completed/phase-4-admin/TASK-400.md) - Manual Trade Entry (original implementation)
- [TASK-501i](../completed/phase-5-ui/TASK-501i.md) - Restyle Admin Import Page
- [TASK-105](../completed/phase-1-import/TASK-105.md) - Flexible Data Import Parser
