# TASK-001: Database Schema Design & Setup

**Status:** COMPLETED
**Created:** January 2026
**Completed:** January 2026
**Priority:** High
**Depends On:** TASK-000
**Phase:** Phase 0 - Setup

---

## Objective

Create database schema using Prisma ORM to support all keeper league management features.

---

## Background

The keeper league management system requires a well-designed database to track teams, players, draft picks, free agent acquisitions, trades, and keeper selections across multiple seasons. The schema must support:
- 10 permanent team slots that persist across seasons
- Player deduplication across imports
- Acquisition history tracking for keeper cost calculations
- Keeper selection with round conflict handling
- Audit logging for all changes

---

## Specification

### Tables Required (7 total)

| Table | Purpose |
|-------|---------|
| `users` | Authentication and user management (email, passwordHash, displayName, isCommissioner) |
| `teams` | Team identity with permanent_id (1-10), season tracking, manager relationship |
| `players` | Master player list with player_match_key for deduplication |
| `seasons` | Yearly configuration (deadline, draft date, total rounds) |
| `player_acquisitions` | Draft picks, FAs, trades with acquisition type tracking |
| `keeper_selections` | Yearly keeper decisions with round conflicts handled via unique constraints |
| `audit_logs` | Change tracking for all user actions |

### Key Design Decisions
- Use `player_match_key` for player deduplication across imports
- Teams have a `permanent_id` (1-10) that doesn't change across seasons
- `player_acquisitions` tracks how each player was acquired (DRAFT, FA, TRADE)
- `keeper_selections` uses unique constraints to prevent duplicate round selections

---

## Technical Approach

1. Design Prisma schema with all 7 models
2. Define relationships between models
3. Add appropriate indexes for query performance
4. Use unique constraints to enforce business rules
5. Generate Prisma Client
6. Push schema to development database

---

## Files Created

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Full schema with all 7 models and relationships |
| `prisma/dev.db` | SQLite database file |

---

## Files Modified

| File | Change |
|------|--------|
| N/A | No existing files modified |

---

## Acceptance Criteria

- [x] `users` table created with email, passwordHash, displayName, isCommissioner
- [x] `teams` table created with permanent_id (1-10) and season tracking
- [x] `players` table created with player_match_key for deduplication
- [x] `seasons` table created with deadline, draft date, total rounds
- [x] `player_acquisitions` table created with acquisition type tracking
- [x] `keeper_selections` table created with round conflict constraints
- [x] `audit_logs` table created for change tracking
- [x] Prisma Client generated successfully
- [x] Database created and schema applied

---

## Verification

```bash
npx prisma generate  # Prisma Client generated successfully
npx prisma db push   # Database created at prisma/dev.db
```

**Expected Output:**
- `npx prisma generate` completes without errors
- `npx prisma db push` creates database at `prisma/dev.db`
- All 7 tables visible in Prisma Studio (`npx prisma studio`)

---

## Completion Notes

All 7 tables created successfully:
1. `users` - For authentication
2. `teams` - With permanent_id for slot identity
3. `players` - With deduplication key
4. `seasons` - For yearly configuration
5. `player_acquisitions` - For tracking how players were acquired
6. `keeper_selections` - With unique constraints for round conflicts
7. `audit_logs` - For change history

Database is ready for the authentication system (TASK-002).

---

## Related

- [TASK-000](./TASK-000.md) - Development Environment Setup (prerequisite)
- [TASK-002](./TASK-002.md) - Authentication System (depends on this task)
- [docs/DATABASE.md](../../../docs/DATABASE.md) - Database documentation
