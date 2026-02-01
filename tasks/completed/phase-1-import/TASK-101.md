# TASK-101: Keeper Cost Calculation Engine

**Status:** COMPLETED
**Created:** January 2026
**Completed:** January 2026
**Priority:** High
**Depends On:** TASK-100
**Phase:** Phase 1 - Import

---

## Objective

Implement keeper cost calculation engine following PRD rules for drafted players, free agents, and trades.

---

## Background

The core feature of the keeper league system is calculating what round a player will cost to keep for the next season. The rules vary based on:
- How the player was acquired (draft, FA, trade)
- How many years the player has been kept
- Original draft round (or R15 for true FAs)

This calculation engine must be accurate as it directly impacts team strategy.

---

## Specification

### Keeper Cost Rules

| Acquisition Type | Year 2 | Year 3 | Year 4+ |
|------------------|--------|--------|---------|
| Drafted Round X  | Round X | Round (X-4) | Round (X-8), then -4/year |
| Free Agent       | Round 15 | Round 11 | Round 7, then -4/year |
| Trade            | Inherits original draft/FA rules |

### Ineligibility
Players become ineligible when calculated cost < Round 1

### Critical Rule Clarifications (2026-01-14)

#### Dropped Player Keeper Cost Rule
> Once a player is drafted, they ALWAYS retain their original draft year/round for keeper cost calculations, even if dropped and re-acquired (by anyone).
>
> **Example:**
> - Year 1: Player drafted Round 17
> - Year 3: Keeper cost = Round 13 (17 - 4)
> - Year 3: Player dropped mid-season
> - Year 3: Someone else picks him up as FA
> - Year 4: Keeper cost = Round 9 (13 - 4, continuing from original draft)

#### FA Round 15 Rule (Strict Definition)
> FA Round 15 cost ONLY applies to:
> 1. Players NEVER drafted by anyone (true undrafted free agents)
> 2. Previously drafted players who were dropped AND not re-acquired that season (re-enter next draft pool as undrafted)

#### Roster Display Rule
> My Team page should only show END OF SEASON roster (current team players).
> - Dropped players should NOT appear on roster
> - Need to filter acquisitions to exclude dropped players

---

## Technical Approach

1. Create keeper calculator as pure function for testability
2. Build comprehensive test suite covering all scenarios
3. Create roster service for database integration
4. Implement API endpoint for team rosters with keeper costs
5. Handle edge cases: same-round conflicts, multi-year progressions, traded players

---

## Files Created

| File | Purpose |
|------|---------|
| `lib/keepers/keeper-calculator.ts` | Core calculation engine with all rules |
| `lib/keepers/types.ts` | TypeScript interfaces for keeper data |
| `lib/keepers/roster-service.ts` | Database integration for fetching rosters |
| `app/api/teams/[teamId]/roster/route.ts` | API endpoint for team rosters with keeper costs |
| `lib/keepers/__tests__/keeper-calculator.test.ts` | Comprehensive test suite |

---

## Files Modified

| File | Change |
|------|--------|
| N/A | Initial implementation |

---

## Acceptance Criteria

- [x] 23 unit tests passing covering all keeper scenarios
- [x] Database integration working with real imported data
- [x] API endpoint tested with actual 2024 season data
- [x] Edge cases handled: same-round conflicts, multi-year progressions, traded players
- [x] Drafted players use correct round progression
- [x] Free agents use Round 15 base cost
- [x] Trades inherit original acquisition rules

---

## Verification

```bash
npm test -- lib/keepers  # 27 tests passing
```

### Implementation Changes Required

**STATUS: COMPLETED (2026-01-16) - See TASK-103**

| # | File | Change | Status |
|---|------|--------|--------|
| 1 | `lib/keeper/calculator.ts` | Fixed year progression: Y2=base, Y3=first -4 | ✓ |
| 2 | `lib/keeper/service.ts` | Search ALL teams for original DRAFT | ✓ |
| 3 | `lib/keeper/service.ts` | Filter out dropped players from roster | ✓ |
| 4 | `prisma/schema.prisma` | Added `droppedDate` field to PlayerAcquisition | ✓ |
| 5 | `lib/keeper/calculator.test.ts` | Updated all 23 test cases for correct rules | ✓ |

---

## Completion Notes

Core keeper calculation engine implemented with all rules. Initial implementation had some rule interpretation issues that were corrected in TASK-103.

Key learnings:
- Year 2 = base cost (no reduction)
- Year 3 = first -4 reduction
- Ineligibility when cost < 1
- Must search ALL teams for original draft to properly track traded players

---

## Related

- [TASK-100](./TASK-100.md) - Excel Import Parser (prerequisite)
- [TASK-102](./TASK-102.md) - My Team Page (uses this engine)
- [TASK-103](./TASK-103.md) - Keeper Cost Rule Corrections (fixes to this engine)
- [docs/DATABASE.md](../../../docs/DATABASE.md) - Schema documentation
