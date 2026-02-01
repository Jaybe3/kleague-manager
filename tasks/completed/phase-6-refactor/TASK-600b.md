# TASK-600b: Data Backfill

**Status:** COMPLETED
**Created:** January 2026
**Completed:** January 2026
**Priority:** High
**Depends On:** TASK-600a
**Phase:** Phase 6 - Schema Refactor

---

## Objective

Populate `slotId` on all existing PlayerAcquisition, KeeperSelection, and KeeperOverride records from their associated `Team.slotId`. Create DraftOrder records from existing `Team.draftPosition`. Move `managerId` from Team to TeamSlot.

---

## Background

After TASK-600a added the nullable `slotId` columns, this task populates them from existing data. This enables the slot-centric queries needed for future season preparation while maintaining backward compatibility.

---

## Specification

### Script Logic

1. **PlayerAcquisition:** For each record, set `slotId = team.slotId` (via teamId relation)
2. **KeeperSelection:** For each record, set `slotId = team.slotId`
3. **KeeperOverride:** For each record, set `slotId = team.slotId`
4. **DraftOrder:** For each Team with `draftPosition`, create DraftOrder record (`slotId`, `seasonYear`, `position`)
5. **TeamSlot.managerId:** For each Team with `managerId`, update corresponding `TeamSlot.managerId` (use most recent season if multiple teams have the same manager)

---

## Technical Approach

1. Create `scripts/backfill-slot-ids.ts` script
2. Process PlayerAcquisition records in batches
3. Process KeeperSelection records
4. Process KeeperOverride records
5. Create DraftOrder records with upsert for idempotency
6. Update TeamSlot.managerId from Team records
7. Verify all counts match expected values

---

## Files Created

| File | Purpose |
|------|---------|
| `scripts/backfill-slot-ids.ts` | One-time migration script |

---

## Files Modified

None (script-only change)

---

## Acceptance Criteria

- [x] All 1,521 PlayerAcquisition records have `slotId` populated (0 nulls)
- [x] All 5 KeeperSelection records have `slotId` populated
- [x] All 1 KeeperOverride record has `slotId` populated
- [x] 30 DraftOrder records created (10 slots × 3 seasons)
- [x] TeamSlot id=10 has `managerId` set (the only slot with a manager)
- [x] Script is idempotent (safe to run multiple times)

---

## Verification

### Verification Commands
```bash
npx tsx -e '
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
  const nullCount = await p.playerAcquisition.count({ where: { slotId: null } });
  const totalCount = await p.playerAcquisition.count();
  console.log(`PlayerAcquisition: ${totalCount - nullCount}/${totalCount} have slotId`);

  const keeperNullCount = await p.keeperSelection.count({ where: { slotId: null } });
  const keeperTotal = await p.keeperSelection.count();
  console.log(`KeeperSelection: ${keeperTotal - keeperNullCount}/${keeperTotal} have slotId`);

  const overrideNullCount = await p.keeperOverride.count({ where: { slotId: null } });
  const overrideTotal = await p.keeperOverride.count();
  console.log(`KeeperOverride: ${overrideTotal - overrideNullCount}/${overrideTotal} have slotId`);

  const draftOrderCount = await p.draftOrder.count();
  console.log(`DraftOrder count: ${draftOrderCount}`);

  const slot10 = await p.teamSlot.findUnique({ where: { id: 10 } });
  console.log(`TeamSlot 10 managerId: ${slot10?.managerId}`);

  await p.$disconnect();
}
main();
'
```

### Expected Output
```
PlayerAcquisition: 1521/1521 have slotId
KeeperSelection: 5/5 have slotId
KeeperOverride: 1/1 have slotId
DraftOrder count: 30
TeamSlot 10 managerId: [user-id-string]
```

---

## Completion Notes

Completed January 2026. All 1,521 acquisitions, 5 keeper selections, and 1 override now have slotId populated. 30 DraftOrder records created (10 slots × 3 seasons). TeamSlot 10 has managerId set. Script verified idempotent.

Key implementation details:
- Script must handle existing DraftOrder records (upsert to be idempotent)
- Only slot 10 has a managerId in the current data (verified in earlier audit)
- After backfill, slotId can be made required in future task (TASK-600c)

---

## Related

- [TASK-600a](./TASK-600a.md) - Schema Additions (prerequisite)
- [TASK-600c](./TASK-600c.md) - Code Migration (next step)
- [TASK-104](../phase-1-import/TASK-104.md) - Team Identity System (Slots)
