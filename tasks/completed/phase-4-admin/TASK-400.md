# TASK-400: Manual Trade Entry

**Status:** COMPLETED
**Created:** January 2026
**Completed:** Verified 2026-01-21
**Priority:** Medium
**Depends On:** TASK-105
**Phase:** Phase 4 - Admin

---

## Objective

Allow commissioner to enter trades manually or import them from CBS transaction data.

---

## Background

Trades are an important part of keeper league management. When a player is traded:
- The receiving team inherits the player's keeper history
- The original draft round is preserved for keeper cost calculations
- The system needs to track who traded the player and when

Trades can come from two sources:
1. CBS transaction data (parsed during import)
2. Manual entry by the commissioner

---

## Specification

### Trade Record Requirements
- Player being traded
- Source team (who traded away)
- Destination team (who received)
- Trade date
- Preserve original draft round for keeper calculations

### Import Features
- Parse "Traded from [Team]" format in CBS transaction text
- Create TRADE acquisition type
- Track source team via `tradedFromTeamId` field
- Close source acquisition when creating trade record

### Manual Entry Features
- Commissioner can enter trade via API
- Specify player, source team, destination team, date
- System validates teams and player exist

---

## Technical Approach

1. Add trade parsing to text parser
2. Update transaction importer to handle TRADE type
3. Create `enterTrade()` function for manual entry
4. Build trade API endpoint for commissioner
5. Ensure idempotent import (safe to reimport)

---

## Files Created

| File | Purpose |
|------|---------|
| `app/api/admin/trade/route.ts` | Trade API endpoint for manual entry |

---

## Files Modified

| File | Change |
|------|--------|
| `lib/importers/text-parser.ts` | Parses "Traded from [Team]" format |
| `lib/importers/transaction-importer.ts` | Creates TRADE acquisitions, handles source team |
| `lib/importers/index.ts` | Added `enterTrade()` function for manual entry |

---

## Acceptance Criteria

- [x] Trades parsed from CBS transaction text
- [x] Trade preserves original draft round
- [x] Trade tracks source team
- [x] Manual trade entry API works
- [x] Idempotent import (safe to reimport)
- [x] Source acquisition closed when trade created

---

## Verification

### Import Verification
```bash
# Import FA transactions including trades
# Paste CBS transaction text with trade records
# Verify TRADE acquisitions created in database

npx prisma studio
# Check player_acquisitions table for acquisitionType = "TRADE"
```

### Database Verification
```bash
npx tsx -e '
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
  const trades = await db.playerAcquisition.count({
    where: { acquisitionType: "TRADE" }
  });
  console.log("TRADE records:", trades);
  await db.$disconnect();
}
main();
'
```

### API Testing
```bash
# Manual trade entry (commissioner only)
curl -X POST http://localhost:3000/api/admin/trade -d '{
  "playerId": "...",
  "fromTeamId": "...",
  "toTeamId": "...",
  "tradeDate": "2025-10-15"
}'
```

---

## Completion Notes

Trade functionality fully implemented:
- CBS transaction parser handles "Traded from [Team]" format
- TRADE acquisitions preserve original draft history
- Source team tracked via `tradedFromTeamId`
- Manual entry API available for commissioner
- Import is idempotent

**Production Data:**
- 8 TRADE records successfully imported to production database

**Note:** Trade entry UI redesign moved to backlog (TASK-601-REDESIGN) for future enhancement of the user interface.

---

## Related

- [TASK-105](../phase-1-import/TASK-105.md) - Flexible Data Import Parser (prerequisite)
- [TASK-103-FINAL](../phase-1-import/TASK-103-FINAL.md) - Keeper Calculation handles trades
- [TASK-601-REDESIGN](../../backlog/TASK-601-REDESIGN.md) - Redesign Trade Entry Feature (future)
