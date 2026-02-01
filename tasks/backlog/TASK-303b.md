# TASK-303b: Integrate Rules into Keeper Calculation

**Status:** BACKLOG
**Created:** January 2026
**Priority:** Low
**Depends On:** TASK-303, TASK-603
**Phase:** Phase 3 - Draft Board (Enhancement)

---

## Objective

Fully integrate `isRuleActive()` checks into the keeper calculation so all rules can be toggled per season.

---

## Background

TASK-303 created the rules registry with `isRuleActive()` checks. TASK-603 partially integrated these checks into the keeper calculator. This task covers any remaining integration work to ensure all 7 rules are fully wired into the calculation pipeline and can be toggled per season.

**Note:** TASK-603 was completed and may have already addressed most of this. Review TASK-603 completion notes to determine remaining work.

---

## Specification

### Rules to Verify Integration

| Rule Code | Integration Point | Logic When Disabled |
|-----------|-------------------|---------------------|
| `KEEPER_COST_YEAR_2` | `calculateKeeperCost()` | Skip Year 2 base cost logic |
| `KEEPER_COST_YEAR_3_PLUS` | `calculateKeeperCost()` | Skip -4 per year reduction |
| `KEEPER_INELIGIBILITY` | `calculateKeeperCost()` | Allow keeper costs < R1 |
| `TRUE_FA_ROUND_15` | `findKeeperBaseAcquisition()` | Use different FA base round |
| `TRADE_INHERITS_COST` | `findKeeperBaseAcquisition()` | Trade does NOT preserve history |
| `FA_INHERITS_DRAFT_ROUND` | `findKeeperBaseAcquisition()` | FA does NOT inherit same-season draft |
| `KEEPER_ROUND_BUMP` | Keeper selection API | Disable round bump feature |

### Implementation Pattern

```typescript
// Modify lib/keeper/calculator.ts to import isRuleActive from rules service
// Wrap rule-specific logic in isRuleActive() checks
// Pass targetYear through calculation pipeline for rule activation checks

// Example:
if (await isRuleActive("FA_INHERITS_DRAFT_ROUND", targetYear)) {
  // Apply FA inherits draft round logic
}
```

---

## Technical Approach

1. Review TASK-603 completion notes to identify what's already done
2. Audit all 7 rules for complete integration
3. Add missing integrations if any
4. Add test cases for each rule toggle
5. Verify toggling rules changes behavior correctly

---

## Files Created

TBD

---

## Files Modified

TBD - likely:
- `lib/keeper/calculator.ts`
- `lib/keeper/service.ts`
- `lib/keeper/calculator.test.ts`

---

## Acceptance Criteria

- [ ] All 7 rules checked via `isRuleActive()` before applying
- [ ] Disabled rules skip that logic (behavior changes)
- [ ] Calculator remains a pure function (flags passed in)
- [ ] Service handles async rule lookups
- [ ] Test cases exist for each rule toggle
- [ ] Manual verification: toggle rule and see cost change

---

## Verification

TBD - will include:
```bash
npm test

# Manual test:
# 1. Go to /admin/rules
# 2. Toggle a rule off
# 3. Check affected player costs
# 4. Toggle rule back on
# 5. Verify costs return to original
```

---

## Completion Notes

N/A - Not yet started

**Note:** Review TASK-603 first - this may already be complete or mostly complete.

---

## Related

- [TASK-303](../completed/phase-3-draft-board/TASK-303.md) - League Rules Registry (prerequisite)
- [TASK-603](../completed/phase-6-refactor/TASK-603.md) - Rules Engine Integration (may have completed this)
- [TASK-101](../completed/phase-1-import/TASK-101.md) - Keeper Cost Calculation Engine
