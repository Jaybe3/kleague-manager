# KLeague Manager - Slot Assignment Guide

## Key Concept

Team access is controlled by **TeamSlot**, not the Team table. When a user logs in, the system looks up their slot assignment, then finds the team for that slot.

```
User ID → TeamSlot.managerId → TeamSlot.id → Team (for that slot + season)
```

## View All Slot Assignments

```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
db.teamSlot.findMany({
  include: { manager: { select: { email: true, displayName: true } } },
  orderBy: { id: 'asc' }
}).then(slots => {
  console.table(slots.map(s => ({
    Slot: s.id,
    Manager: s.manager?.displayName || '(unassigned)',
    Email: s.manager?.email || '-',
    ManagerId: s.managerId || '-'
  })));
  db.\$disconnect();
});
"
```

## Assign a Manager to a Slot

```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
db.teamSlot.update({
  where: { id: SLOT_NUMBER },
  data: { managerId: 'USER_ID_HERE' }
}).then(r => { console.log('Updated:', r); db.\$disconnect(); });
"
```

Replace `SLOT_NUMBER` (1-10) and `USER_ID_HERE`.

## Remove a Manager from a Slot

```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
db.teamSlot.update({
  where: { id: SLOT_NUMBER },
  data: { managerId: null }
}).then(r => { console.log('Cleared:', r); db.\$disconnect(); });
"
```

## Find a User's ID by Email

```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
db.user.findUnique({
  where: { email: 'user@example.com' }
}).then(u => { console.log(u); db.\$disconnect(); });
"
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| User can't see their team | `TeamSlot.managerId` is null | Assign manager to slot |
| User sees wrong team | Assigned to wrong slot | Update slot assignment |
| "No team slot assigned" error | User not in any TeamSlot | Assign to correct slot |
