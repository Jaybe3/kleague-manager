# TASK-601: Keeper Calculation - Detect Chain Breaks

**Status:** COMPLETED
**Created:** January 2026
**Completed:** January 2026
**Priority:** High
**Depends On:** TASK-600c
**Phase:** Phase 6 - Keeper Fixes

---

## Objective

Fix keeper calculation algorithm to detect when a player was NOT kept (chain break). When chain is broken, subsequent acquisitions get a clean slate.

---

## Background

The keeper calculation algorithm had a bug where it used the EARLIEST acquisition on a slot regardless of whether the player had been kept continuously. When a player is dropped or not kept, then re-acquired later, they should get a clean slate - the keeper clock resets.

---

## Specification

### The Bug (Danielle Hunter Example)

| Season | Type | Round | Notes |
|--------|------|-------|-------|
| 2023 | DRAFT | R19 | Original draft |
| 2024 | DRAFT | R19 | Kept (CBS creates new DRAFT record) |
| 2025 | FA | - | NOT kept, re-acquired as FA |

**Current Algorithm:** Uses 2023 as base → 2026 cost = R11 (WRONG)
**Correct:** 2025 FA is clean slate → 2026 cost = R15 (CORRECT)

### Chain Break Detection Rule

CBS creates a DRAFT record each year a player is kept. If there's no DRAFT record for year N when there was one for year N-1, the player was NOT kept. Chain is broken. Later acquisition = clean slate.

**Key Insight:** A continuous keeper chain shows as consecutive DRAFT records on the same slot. A gap (no DRAFT, or FA, or DROP) breaks the chain.

### Algorithm Change in findKeeperBaseAcquisition()

**Current Logic (Flawed):**
1. Get ALL acquisitions on slot
2. Return EARLIEST → Uses 2023 DRAFT for Danielle Hunter (wrong)

**New Logic (Correct):**
1. Get current active acquisition on slot
2. Get ALL acquisitions for player on this slot, grouped by season
3. Walk backward from current season checking for continuous DRAFT records
4. If gap found (no DRAFT in year N-1): Chain broken, use current acquisition as base
5. If continuous: Use earliest DRAFT in continuous chain as base
6. Handle TRADE (preserves full history) and FA (same-season inheritance) as before

---

## Technical Approach

### Pseudocode

```typescript
async function findKeeperBaseAcquisition(playerId: string, slotId: number, targetYear: number) {
  // 1. Get current active acquisition
  const currentAcq = await db.playerAcquisition.findFirst({
    where: { playerId, slotId, droppedDate: null },
    orderBy: { acquisitionDate: 'desc' }
  });

  if (!currentAcq) return null;

  // 2. Get ALL acquisitions on this slot
  const allOnSlot = await db.playerAcquisition.findMany({
    where: { playerId, slotId },
    orderBy: { seasonYear: 'asc' }
  });

  // 3. Group by season
  const bySeasonMap = new Map<number, PlayerAcquisition[]>();
  for (const acq of allOnSlot) {
    const list = bySeasonMap.get(acq.seasonYear) || [];
    list.push(acq);
    bySeasonMap.set(acq.seasonYear, list);
  }

  // 4. Walk backward looking for chain break
  let chainStart = currentAcq;

  for (let year = currentAcq.seasonYear - 1; year >= Math.min(...bySeasonMap.keys()); year--) {
    const prevYearAcqs = bySeasonMap.get(year);

    // No record for previous year = chain broken
    if (!prevYearAcqs) break;

    // Check for DRAFT (kept players show as DRAFT)
    const draftAcq = prevYearAcqs.find(a => a.acquisitionType === 'DRAFT');

    if (draftAcq) {
      chainStart = draftAcq; // Chain continues
    } else {
      break; // No DRAFT = chain broken (was FA/TRADE that year, not kept)
    }
  }

  // 5. Handle acquisition type of chain start
  if (chainStart.acquisitionType === 'DRAFT') {
    return chainStart;
  }

  if (chainStart.acquisitionType === 'TRADE') {
    return findOriginalDraftForTrade(playerId);
  }

  if (chainStart.acquisitionType === 'FA') {
    // Check same-season draft by any team
    const sameSeasonDraft = await db.playerAcquisition.findFirst({
      where: { playerId, seasonYear: chainStart.seasonYear, acquisitionType: 'DRAFT' }
    });
    return sameSeasonDraft || chainStart;
  }

  return chainStart;
}
```

---

## Files Created

None

---

## Files Modified

| File | Change |
|------|--------|
| `lib/keeper/service.ts` | Rewrite `findKeeperBaseAcquisition()` with chain detection |
| `lib/keeper/calculator.test.ts` | Add test cases for chain breaks |

---

## Acceptance Criteria

- [x] Chain break detection implemented in `findKeeperBaseAcquisition()`
- [x] Danielle Hunter correctly shows R15 for 2026 (not R11)
- [x] Continuous keepers still calculate correctly (earliest DRAFT in chain)
- [x] Trade history preservation still works
- [x] Same-season FA inheritance still works
- [x] True FA R15 rule still works
- [x] All new test cases pass (33 tests)
- [x] All existing tests still pass

---

## Verification

### Test Cases Added

| Scenario | Setup | Expected 2026 Cost |
|----------|-------|-------------------|
| Continuous keeper | 2023 DRAFT R10, 2024 DRAFT R10, 2025 DRAFT R10 | R2 (Year 4: 10-8) |
| Chain broken - not kept | 2023 DRAFT R19, 2024 DRAFT R19, 2025 FA | R15 (clean slate from 2025 FA) |
| Chain broken - dropped | 2024 DRAFT R8 (dropped), 2025 FA | R15 (clean slate from 2025 FA) |
| Trade preserves history | 2023 DRAFT R5 Slot 3, 2024 TRADE Slot 10, 2025 DRAFT R1 Slot 10 | R1 (trade preserved, Year 4: 5-4=1) |
| FA same season as draft | 2025 DRAFT R12 Slot 2, 2025 FA Slot 10 | R12 (inherits same-season draft) |
| True FA | 2025 FA (never drafted) | R15 (true FA base) |
| Fresh draft year 2 | 2025 DRAFT R7 | R7 (Year 2: base cost) |

### Verification Commands

```bash
# Run all tests
npm test

# Manual verification:
# 1. Check Danielle Hunter keeper cost on /my-team (should show R15 for 2026)
# 2. Verify other players still calculate correctly
```

---

## Completion Notes

Completed January 2026. Chain break detection implemented and verified working correctly.

Key insights:
- This bug affects any player who was kept for multiple years, then NOT kept, then re-acquired
- The fix is in the service layer (`findKeeperBaseAcquisition`), not the calculator
- Calculator logic remains correct - it's the base acquisition lookup that was wrong
- Must query by `slotId` (not `teamId`) per TASK-600c refactor

Test coverage increased to 33 tests, all passing.

---

## Related

- [TASK-600c](./TASK-600c.md) - Code Migration (prerequisite - provides slotId queries)
- [TASK-604](./TASK-604.md) - Slot 10 Keeper Cost Audit (validation of this fix)
- [TASK-103-FINAL](../phase-1-import/TASK-103-FINAL.md) - Original Keeper Acquisition Logic
