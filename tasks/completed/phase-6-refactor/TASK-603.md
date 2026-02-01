# TASK-603: Rules Engine Integration

**Status:** COMPLETED
**Created:** January 2026
**Completed:** January 2026
**Priority:** Medium
**Depends On:** TASK-601
**Phase:** Phase 6 - Rules Integration
**Replaces:** TASK-303b (from backlog)

---

## Objective

Wire `isRuleActive()` into keeper calculator so rules can be toggled per season. Currently the LeagueRule table exists with 7 rules and `isRuleActive(code, seasonYear)` function exists, but the calculator does NOT check rule activation.

---

## Background

TASK-303 created the League Rules Registry with 7 rules and the `isRuleActive(code, seasonYear)` function. However, the keeper calculator was hardcoded and did not check rule activation status. This task wires the rules into the calculation pipeline so commissioners can toggle rules per season.

---

## Specification

### Rules to Integrate

| Rule Code | Integration Point | Logic When Disabled |
|-----------|-------------------|---------------------|
| `KEEPER_COST_YEAR_2` | `calculateKeeperCost()` | Skip Year 2 base cost logic |
| `KEEPER_COST_YEAR_3_PLUS` | `calculateKeeperCost()` | Skip -4 per year reduction |
| `KEEPER_INELIGIBILITY` | `calculateKeeperCost()` | Allow keeper costs < R1 |
| `TRUE_FA_ROUND_15` | `findKeeperBaseAcquisition()` | Use different FA base round |
| `TRADE_INHERITS_COST` | `findKeeperBaseAcquisition()` | Trade does NOT preserve history |
| `FA_INHERITS_DRAFT_ROUND` | `findKeeperBaseAcquisition()` | FA does NOT inherit same-season draft |
| `KEEPER_ROUND_BUMP` | Keeper selection API | Disable round bump feature |

### Current State

**lib/rules/rules-service.ts:**
```typescript
export async function isRuleActive(code: string, seasonYear: number): Promise<boolean> {
  const rule = await db.leagueRule.findUnique({ where: { code } });
  if (!rule) return false;
  return rule.enabled && seasonYear >= rule.effectiveSeason;
}
```

**lib/keeper/calculator.ts:**
- Pure function with no rule checks
- Takes `acquisitionType`, `originalDraftRound`, `acquisitionYear`, `targetYear`
- Returns `KeeperCalculationResult`

**lib/keeper/service.ts:**
- `findKeeperBaseAcquisition()` handles FA/TRADE/DRAFT logic
- `getPlayerKeeperCost()` calls calculator
- No rule checks currently

---

## Technical Approach

### Integration Pattern: Pass Rule Flags (Recommended)

```typescript
// types.ts
interface KeeperRuleFlags {
  keeperCostYear2: boolean;
  keeperCostYear3Plus: boolean;
  keeperIneligibility: boolean;
  // ...
}

// service.ts
const flags: KeeperRuleFlags = {
  keeperCostYear2: await isRuleActive('KEEPER_COST_YEAR_2', targetYear),
  keeperCostYear3Plus: await isRuleActive('KEEPER_COST_YEAR_3_PLUS', targetYear),
  keeperIneligibility: await isRuleActive('KEEPER_INELIGIBILITY', targetYear),
};

// calculator.ts - pure function, testable
export function calculateKeeperCost(
  input: KeeperCalculationInput,
  flags: KeeperRuleFlags = DEFAULT_FLAGS // All enabled by default
): KeeperCalculationResult {
  if (flags.keeperCostYear3Plus && yearsKept > 1) {
    costReduction = 4 * (yearsKept - 1);
  }
  // ...
}
```

This keeps the calculator as a pure function (testable) while the service layer handles async DB calls for rule lookups.

---

## Files Created

None

---

## Files Modified

| File | Change |
|------|--------|
| `lib/keeper/calculator.ts` | Add optional `ruleFlags` parameter, wrap logic in rule checks |
| `lib/keeper/service.ts` | Call `isRuleActive()` for each rule, pass flags to calculator |
| `lib/keeper/types.ts` | Add `KeeperRuleFlags` interface |

---

## Acceptance Criteria

- [x] All 7 rules checked via `isRuleActive()` before applying
- [x] Disabled rules skip that logic (behavior changes)
- [x] Calculator remains a pure function (flags passed in)
- [x] Service handles async rule lookups
- [x] All existing tests still pass (33 tests)
- [x] FA_INHERITS_DRAFT_ROUND verified: false for 2024, true for 2025+
- [x] Manual test: Verified rule activation by year

---

## Verification

### Test Cases to Add

| Scenario | Setup | Expected |
|----------|-------|----------|
| Year 3+ rule disabled | R10, Year 3, `keeperCostYear3Plus: false` | R10 (no reduction) |
| Year 3+ rule enabled | R10, Year 3, `keeperCostYear3Plus: true` | R6 (R10-4) |
| Ineligibility disabled | R1, Year 3 | R-3 (allow negative) |
| FA inherits disabled | 2025 FA, 2025 DRAFT R12 exists | R15 (not R12) |

### Verification Commands

```bash
# Run all tests
npm test

# Manual test:
# 1. Go to /admin/rules
# 2. Disable FA_INHERITS_DRAFT_ROUND
# 3. Check a player who picked up a dropped rookie
# 4. Verify they show R15 (not the draft round)
# 5. Re-enable rule, verify R12 returns
```

---

## Completion Notes

Completed January 2026. Added `KeeperRuleFlags` interface to types.ts with all 7 rules. Calculator now accepts optional `ruleFlags` parameter (defaults to all enabled). Service layer fetches rule flags via `fetchRuleFlags()` using `isRuleActive()` for each rule.

Key implementation details:
- Calculator remains a pure function for testability
- Service layer handles async DB calls for rule lookups
- Default behavior (all rules enabled) matches current behavior
- This enables historical rule changes (e.g., "this rule started in 2024")

**Important Fix:** `FA_INHERITS_DRAFT_ROUND` now correctly returns false for 2024 and earlier (FA uses R15), true for 2025+ (FA inherits same-season draft). All 33 tests pass.

---

## Related

- [TASK-601](./TASK-601.md) - Chain Break Detection (prerequisite)
- [TASK-303](../phase-3-draft-board/TASK-303.md) - League Rules Registry (created the rules)
- [TASK-303b](../../backlog/TASK-303b.md) - Original backlog item (replaced by this)
