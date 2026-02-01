# TASK-103-FINAL: Complete Keeper Acquisition Logic Rewrite

**Status:** COMPLETED
**Created:** January 2026
**Completed:** 2026-01-20
**Priority:** High
**Depends On:** TASK-103
**Supersedes:** TASK-103b
**Phase:** Phase 1 - Import

---

## Objective

Complete rewrite of keeper acquisition lookup with ALL rules handled correctly.

---

## Background

After implementing TASK-103, additional edge cases were discovered that required a complete rewrite of the acquisition lookup logic. The key insight was understanding how CBS handles keeper records:

**Key CBS Behavior:**
When you KEEP a player, CBS creates a NEW "DRAFT" record each year at their keeper cost. So a kept player has MULTIPLE DRAFT records on the same slot across seasons.

This means we need slot-based lookup, not just team-based lookup.

---

## Specification

### Complete Rules Implemented

1. **KEEPER (same slot, multiple seasons):** Find ALL acquisitions on this SLOT across seasons. Return the EARLIEST one - that's when the keeper clock started.

2. **FRESH DRAFT (same slot, first appearance):** Only ONE acquisition exists on this slot. Keeper clock starts now.

3. **TRADE:** Trades preserve history. Find the EARLIEST DRAFT across ALL teams.

4. **FA (same season as a draft):** If player was DRAFTED same season by ANY team (then dropped), inherit that draft round.

5. **TRUE FA:** If player was never drafted that season, use Round 15.

### Algorithm (`findKeeperBaseAcquisition`)

```
1. Get player's ACTIVE acquisition on this team (droppedDate = null)
2. Get the team's SLOT ID
3. Find ALL acquisitions for this player on this SLOT (any season)
4. If multiple acquisitions exist on this slot:
   → Return the EARLIEST one (keeper clock started there)
5. If only ONE acquisition on this slot (current one):
   a. If DRAFT → Fresh draft, return this acquisition
   b. If TRADE → Find earliest DRAFT across ALL teams (trades preserve full history)
   c. If FA → Check if drafted same season by ANY team
      - If YES → Return that same-season DRAFT (inherit round)
      - If NO → Return FA acquisition (true FA, Round 15)
```

---

## Technical Approach

1. Rewrite `findKeeperBaseAcquisition()` with slot-based lookup
2. Add `findOriginalDraftForTrade()` helper for TRADE acquisitions
3. Remove old `followTradeChainToOrigin()` function
4. Test all edge cases with real data

---

## Files Created

| File | Purpose |
|------|---------|
| N/A | This was a rewrite of existing code |

---

## Files Modified

| File | Change |
|------|--------|
| `lib/keeper/service.ts` | Complete rewrite of `findKeeperBaseAcquisition()` with slot-based lookup |
| `lib/keeper/service.ts` | Added `findOriginalDraftForTrade()` helper |
| `lib/keeper/service.ts` | Removed `followTradeChainToOrigin()` |

---

## Acceptance Criteria

- [x] Kept players use EARLIEST acquisition on slot (correct year counting)
- [x] Fresh drafts use YOUR draft round
- [x] Trades preserve original keeper history
- [x] Same-season FA pickups inherit that season's draft round
- [x] True FAs use Round 15
- [x] TypeScript compiles with no errors
- [x] All existing tests pass (23/23)

---

## Verification

### Test Cases

| Player | Situation | Expected 2026 Cost |
|--------|-----------|-------------------|
| Malik Nabers | 2024 Rd 4 on your slot, 2025 kept on your slot | INELIGIBLE (Year 3: 4-4=0) |
| Kenneth Walker III | 2025 Rd 5, first year on your slot | Round 5 (Year 2) |
| Zaire Franklin | 2025 Rd 1, first year on your slot | Round 1 (Year 2) |
| Jayden Daniels | 2024 Rd 1 on your slot, 2025 kept | INELIGIBLE (Year 3: 1-4=-3) |
| Rome Odunze | 2024 Rd 10 on your slot, 2025 kept | Round 6 (Year 3: 10-4) |
| Sam LaPorta | FA 2025, was drafted Rd 25 same season | Round 21 (Year 2: 25-4) |
| George Karlaftis | FA 2025, never drafted in 2025 | Round 15 (Year 2) |

### Manual Verification
```bash
npm test
npx tsc --noEmit
```

---

## Completion Notes

Complete rewrite achieved correct keeper cost calculations for all scenarios. The key insight was that CBS creates new DRAFT records each year a player is kept, so we must:

1. Look up by SLOT, not by team
2. Find the EARLIEST acquisition on that slot
3. That's when the keeper clock started

This approach correctly handles:
- Players kept for multiple years
- Fresh drafts
- Trades (preserve full history)
- Same-season FA pickups (inherit draft round)
- True FAs (Round 15)

---

## Related

- [TASK-103](./TASK-103.md) - Initial rule corrections (prerequisite)
- [TASK-104](./TASK-104.md) - Team Identity System (slot-based lookup)
- [.clinerules](../../../.clinerules) - Documents the final algorithm
