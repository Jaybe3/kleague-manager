# TASK-104: Team Identity System (Slots)

**Status:** COMPLETED
**Created:** January 2026
**Completed:** Implemented during development, verified 2026-01-21
**Priority:** High
**Depends On:** TASK-001
**Phase:** Phase 1 - Import

---

## Objective

Replace current broken team identity (draft position as permanentId) with proper slot-based system that survives team renames and CBS retroactive name changes.

---

## Background

A critical problem was discovered: CBS Sports retroactively updates historical data when teams rebrand. For example, "Discount Belichick" (2023-2024) now shows as "Seal Team Nix" in historical FA data, even though that name change happened in 2025.

This breaks keeper tracking because the system was using team names as identifiers. The solution is a slot-based system where:
- Each league position (1-10) is a permanent "slot"
- Team names are just aliases that map to slots
- Keeper logic follows the SLOT, not the team name

---

## Specification

### Database Tables

#### TeamSlot
- 10 permanent records (slots 1-10)
- Never changes, represents the "seat at the table"
- Has `managerId` for the slot owner

#### TeamAlias
- Maps team names → slots with year ranges
- Handles CBS retroactive renames
- Query: `getSlotIdFromTeamName(name, year)`

### Current Team Aliases

| Slot | Name | Valid Years |
|------|------|-------------|
| 1 | Gatordontplay | 2023-2024 |
| 1 | Gatordontplayanymorebchesucked | 2025+ |
| 2 | Box of Rocks | 2023-2024 |
| 2 | run ACHANE on her | 2025+ |
| 3 | Woody and the Jets! | 2023+ |
| 4 | Go Go Garrett | 2023-2024 |
| 4 | The Better Business Burrow | 2025+ |
| 5 | Discount Belichick | 2023-2024 |
| 5 | Seal Team Nix | 2025+ |
| 6 | Team 4 | 2023+ |
| 7 | The Bushwhackers | 2023+ |
| 8 | Sweet Chin Music | 2023+ |
| 9 | Fields of Dreams | 2023+ |
| 10 | Ridley Me This | 2023 |
| 10 | Let Bijans be Bijans | 2024 |
| 10 | Nabers Think I'm Selling Dope | 2025+ |

---

## Technical Approach

1. Create `TeamSlot` table with 10 permanent records
2. Create `TeamAlias` table with name → slot mappings
3. Add `slotId` foreign key to `Team` table
4. Implement `getSlotIdFromTeamName()` lookup function
5. Update importers to use slot lookup
6. Update keeper calculations to use slot-based queries

---

## Files Created

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | TeamSlot and TeamAlias models |
| `lib/importers/team-mapper.ts` | `getSlotIdFromTeamName()` function |

---

## Files Modified

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Added TeamSlot, TeamAlias models; Team.slotId reference |

---

## Acceptance Criteria

- [x] TeamSlot table has 10 permanent records
- [x] TeamAlias table has all known name mappings (16 aliases)
- [x] `getSlotIdFromTeamName("Seal Team Nix", 2023)` returns 5 (CBS retroactive rename)
- [x] `getSlotIdFromTeamName("Discount Belichick", 2023)` returns 5
- [x] Team.slotId correctly references TeamSlot.id

---

## Verification

```bash
# Verify TeamSlot records
npx prisma studio
# Check team_slots table has 10 records

# Verify alias lookup
npx tsx -e '
import { getSlotIdFromTeamName } from "./lib/importers/team-mapper";
console.log(getSlotIdFromTeamName("Seal Team Nix", 2023)); // Should be 5
console.log(getSlotIdFromTeamName("Discount Belichick", 2023)); // Should be 5
'
```

---

## Completion Notes

The slot-based team identity system solves the CBS retroactive rename problem completely. Key benefits:

1. **Permanent identity** - Slots 1-10 never change
2. **Name flexibility** - Teams can rename freely
3. **Historical accuracy** - CBS retroactive changes don't break tracking
4. **Keeper correctness** - Keeper calculations follow slots, not names

This is documented as a CRITICAL rule in `.clinerules` under "Team Identity System".

---

## Related

- [TASK-001](../phase-0-setup/TASK-001.md) - Database Schema Design (added slot tables)
- [TASK-103-FINAL](./TASK-103-FINAL.md) - Uses slot-based lookup for keepers
- [TASK-105](./TASK-105.md) - Flexible import uses slot mapping
- [.clinerules](../../../.clinerules) - Documents the slot system
