# TASK-600a: Schema Additions (Non-Breaking)

**Status:** COMPLETED
**Created:** January 2026
**Completed:** January 2026
**Priority:** High
**Depends On:** N/A
**Phase:** Phase 6 - Schema Refactor

---

## Objective

Add `slotId` columns (nullable) to PlayerAcquisition, KeeperSelection, KeeperOverride. Create DraftOrder table. Add `managerId` to TeamSlot. All additions are non-breaking - existing code continues to work with `teamId`.

---

## Background

The team-as-intermediary model caused BUG-002: Teams only exist after draft import, blocking draft preparation for future seasons. The solution is to refactor to a slot-centric model where `slotId` is the primary identifier. This task adds the schema changes non-destructively so existing code continues to work during migration.

---

## Specification

### Schema Changes

**1. PlayerAcquisition - Add slotId:**
```prisma
model PlayerAcquisition {
  // ... existing fields ...
  slotId  Int?      @map("slot_id")    // NEW - nullable during migration

  // ... existing relations ...
  slot    TeamSlot? @relation(fields: [slotId], references: [id])  // NEW
}
```

**2. KeeperSelection - Add slotId:**
```prisma
model KeeperSelection {
  // ... existing fields ...
  slotId  Int?      @map("slot_id")    // NEW - nullable during migration

  // ... existing relations ...
  slot    TeamSlot? @relation(fields: [slotId], references: [id])  // NEW
}
```

**3. KeeperOverride - Add slotId:**
```prisma
model KeeperOverride {
  // ... existing fields ...
  slotId  Int?      @map("slot_id")    // NEW - nullable during migration

  // ... existing relations ...
  slot    TeamSlot? @relation(fields: [slotId], references: [id])  // NEW
}
```

**4. TeamSlot - Add managerId and reverse relations:**
```prisma
model TeamSlot {
  id        Int      @id
  managerId String?  @map("manager_id")  // NEW
  createdAt DateTime @default(now()) @map("created_at")

  manager      User?               @relation(fields: [managerId], references: [id])  // NEW
  aliases      TeamAlias[]
  teams        Team[]
  acquisitions PlayerAcquisition[]  // NEW reverse relation
  keepers      KeeperSelection[]    // NEW reverse relation
  overrides    KeeperOverride[]     // NEW reverse relation
  draftOrders  DraftOrder[]         // NEW reverse relation
}
```

**5. User - Add slots reverse relation:**
```prisma
model User {
  // ... existing fields ...
  slots     TeamSlot[]  // NEW reverse relation
}
```

**6. New DraftOrder Model:**
```prisma
model DraftOrder {
  id         String   @id @default(cuid())
  slotId     Int      @map("slot_id")
  seasonYear Int      @map("season_year")
  position   Int                           // 1-10 draft position
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  slot TeamSlot @relation(fields: [slotId], references: [id])

  @@unique([slotId, seasonYear])           // One position per slot per season
  @@unique([seasonYear, position])         // No duplicate positions per season
  @@map("draft_orders")
}
```

---

## Technical Approach

1. Add all new columns as nullable to avoid breaking existing data
2. Add new relations with proper foreign key constraints
3. Create DraftOrder table with appropriate unique constraints
4. Use `prisma db push` for schema changes (sqlite→postgresql migration issue)
5. Verify existing data preserved after migration

---

## Files Created

None

---

## Files Modified

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add all schema changes above |

---

## Acceptance Criteria

- [x] `slot_id` column added to `player_acquisitions` table (nullable)
- [x] `slot_id` column added to `keeper_selections` table (nullable)
- [x] `slot_id` column added to `keeper_overrides` table (nullable)
- [x] `manager_id` column added to `team_slots` table (nullable)
- [x] `draft_orders` table created with unique constraints
- [x] All Prisma relations defined correctly (no TypeScript errors)
- [x] `npx prisma db push` runs without errors
- [x] Existing data preserved (all 1,521 acquisitions still exist)
- [x] Existing application still works (non-breaking change)

---

## Verification

### Verification Commands
```bash
# Check migration status
npx prisma migrate status

# Verify columns exist and data preserved
npx tsx -e '
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
  const acqCount = await p.playerAcquisition.count();
  const keeperCount = await p.keeperSelection.count();
  const overrideCount = await p.keeperOverride.count();
  console.log("PlayerAcquisition count:", acqCount);
  console.log("KeeperSelection count:", keeperCount);
  console.log("KeeperOverride count:", overrideCount);

  // Verify new columns exist (will be null)
  const sample = await p.playerAcquisition.findFirst();
  console.log("Sample acquisition slotId:", sample?.slotId);

  // Verify DraftOrder table exists
  const draftOrderCount = await p.draftOrder.count();
  console.log("DraftOrder count:", draftOrderCount);

  await p.$disconnect();
}
main();
'
```

### Expected Output
- PlayerAcquisition count: 1521
- KeeperSelection count: 5
- KeeperOverride count: 1
- Sample acquisition slotId: null
- DraftOrder count: 0

---

## Completion Notes

Completed January 2026. Used `prisma db push` instead of `migrate dev` due to sqlite→postgresql provider change in migration history. All new columns added successfully, existing data preserved (1,521 acquisitions, 5 keeper selections, 1 override).

Key decisions:
- All new columns are nullable to avoid breaking existing data
- Existing `teamId` relations remain functional
- Next task (TASK-600b) will backfill `slotId` from existing `team.slotId`
- Final task will make `slotId` required and optionally deprecate `teamId`

---

## Related

- [TASK-600b](./TASK-600b.md) - Data Backfill (next step)
- [TASK-600c](./TASK-600c.md) - Code Migration
- [TASK-104](../phase-1-import/TASK-104.md) - Team Identity System (Slots)
- [BUG-002](../../bugs/BUG-002.md) - Cannot Set Draft Order for Future Season
