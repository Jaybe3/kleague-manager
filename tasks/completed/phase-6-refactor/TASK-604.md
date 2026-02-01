# TASK-604: Slot 10 Keeper Cost Audit

**Status:** COMPLETED
**Created:** January 2026
**Completed:** January 2026
**Priority:** High
**Depends On:** TASK-601
**Phase:** Phase 6 - Verification

---

## Objective

Verify all players on Slot 10 (commissioner's team) show correct keeper costs after TASK-601 chain break detection fix.

---

## Background

After implementing the chain break detection fix in TASK-601, a comprehensive audit was needed to verify the keeper cost calculations are correct for all players. Slot 10 (the commissioner's team) was chosen because it has known test cases including Danielle Hunter (chain broken by 2025 FA).

---

## Specification

### Audit Process

1. Get current roster for Slot 10 (2025 season, active players)
2. For each player, show:
   - Full acquisition history (all seasons, all slots)
   - Chain analysis (continuous or broken)
   - Base acquisition identified
   - Expected 2026 keeper cost with reasoning
   - Actual 2026 keeper cost from system
   - Match status (✓ CORRECT or ✗ DISCREPANCY)
3. Flag any discrepancies for investigation

### Known Players to Verify

| Player | Expected 2026 | Reasoning |
|--------|---------------|-----------|
| Danielle Hunter | R15 | Chain broken at 2025 FA, clean slate |
| Malik Nabers | INELIGIBLE | 2024 R4, Year 3 = R4-4 = R0 < 1 |
| Kenneth Walker III | R5 | 2025 R5, Year 2 = base cost |
| Rome Odunze | R6 | 2024 R10, Year 3 = R10-4 = R6 |

### Output Format

```
=== SLOT 10 KEEPER COST AUDIT ===
Team: Nabers Think I'm Selling Dope (2025)

--- Danielle Hunter (DL) ---
Acquisition History:
  2023 | Slot 10 | DRAFT R19
  2024 | Slot 10 | DRAFT R19
  2025 | Slot 10 | FA

Chain Analysis: 2025 is FA (not DRAFT) → Chain BROKEN
Base Acquisition: 2025 FA (clean slate)

Expected 2026 Cost: R15 (Year 2 from 2025 FA)
Actual 2026 Cost:   R15
Status: ✓ CORRECT

--- [Next Player] ---
...

=== SUMMARY ===
Total Players: X
Correct: Y
Discrepancies: Z
```

---

## Technical Approach

1. Create `scripts/audit-slot-10.ts` script
2. Query all active players on Slot 10 for 2025 season
3. For each player, fetch full acquisition history across all slots
4. Analyze keeper chain continuity
5. Call keeper cost calculation service
6. Compare expected vs actual results
7. Generate formatted report

---

## Files Created

| File | Purpose |
|------|---------|
| `scripts/audit-slot-10.ts` | Generate audit report |

---

## Files Modified

None

---

## Acceptance Criteria

- [x] Audit script generates report for all Slot 10 players (33 players)
- [x] Each player's full acquisition history visible
- [x] Chain analysis shows break detection working
- [x] Danielle Hunter shows R15 (not R11) ✓
- [x] Malik Nabers shows INELIGIBLE ✓
- [x] All known players verified correct (33/33)
- [x] Any discrepancies documented (0 discrepancies)
- [x] Phase 6 keeper fixes can be marked complete

---

## Verification

### Verification Commands

```bash
npx tsx scripts/audit-slot-10.ts
```

### Expected Output Summary
```
=== SUMMARY ===
Total Players: 33
Correct: 33
Discrepancies: 0
```

---

## Completion Notes

Completed January 2026. Enhanced in TASK-604b to show calculated vs override costs separately.

Audit results:
- 33 players audited
- 32 without overrides
- 1 with override (Jayden Daniels: Calculated=INELIGIBLE, Override=R1)
- Danielle Hunter correctly shows R15 (chain broken by 2025 FA)
- All 33 players verified correct

This audit validates the TASK-601 chain break detection fix is working correctly. The script can be adapted for other slots if needed.

---

## Related

- [TASK-601](./TASK-601.md) - Chain Break Detection (validated by this audit)
- [TASK-603](./TASK-603.md) - Rules Engine Integration
- [TASK-302](../phase-3-draft-board/TASK-302.md) - Admin Keeper Override (explains override handling)
