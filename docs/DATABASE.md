# Database Schema

This document provides a comprehensive reference for the KLeague Manager database schema, relationships, constraints, and common query patterns.

**Audience:** Architects, developers, database administrators

---

## Table of Contents

1. [Overview](#overview)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [Tables Reference](#tables-reference)
4. [Relationships](#relationships)
5. [Indexes & Constraints](#indexes--constraints)
6. [Naming Conventions](#naming-conventions)
7. [Common Query Patterns](#common-query-patterns)
8. [Sample Data](#sample-data)
9. [Data Integrity Rules](#data-integrity-rules)
10. [Known Data Issues](#known-data-issues)
11. [Migration Approach](#migration-approach)

---

## Overview

| Metric | Value |
|--------|-------|
| Database | PostgreSQL (production), SQLite (development) |
| ORM | Prisma |
| Tables | 11 |
| Total Records | ~2,300 |

### Table Summary

| Table | Purpose | Record Count |
|-------|---------|--------------|
| `users` | User accounts and authentication | ~5 |
| `team_slots` | Permanent franchise positions (1-10) | 10 |
| `team_aliases` | Team name → slot mappings by year | ~30 |
| `teams` | Season-specific team records | ~40 |
| `draft_orders` | Draft position per slot per season | ~40 |
| `players` | Master player list | ~664 |
| `player_acquisitions` | Draft picks, FA signings, trades | ~1,521 |
| `keeper_selections` | Keeper choices by season | ~10 |
| `keeper_overrides` | Commissioner cost overrides | ~1 |
| `league_rules` | Configurable rule flags | 7 |
| `seasons` | Season configuration | 4 |
| `audit_logs` | Change tracking | ~50 |

---

## Entity Relationship Diagram
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              IDENTITY LAYER                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐        │
│  │    users     │         │  team_slots  │         │   seasons    │        │
│  │──────────────│         │──────────────│         │──────────────│        │
│  │ id           │    1    │ id (1-10)    │         │ year         │        │
│  │ email        │◄────────│ manager_id   │         │ is_active    │        │
│  │ display_name │         │              │         │ keeper_deadline       │
│  │ is_commissioner  │         │              │         │ total_rounds │        │
│  └──────────────┘         └──────────────┘         └──────────────┘        │
│                                  │                                          │
│                    ┌─────────────┼─────────────┐                           │
│                    │             │             │                            │
│                    ▼             ▼             ▼                            │
│            ┌──────────────┐ ┌──────────────┐ ┌──────────────┐              │
│            │ team_aliases │ │ draft_orders │ │    teams     │              │
│            │──────────────│ │──────────────│ │──────────────│              │
│            │ slot_id      │ │ slot_id      │ │ slot_id      │              │
│            │ team_name    │ │ season_year  │ │ season_year  │              │
│            │ valid_from   │ │ position     │ │ team_name    │              │
│            │ valid_to     │ │              │ │ draft_position              │
│            └──────────────┘ └──────────────┘ └──────────────┘              │
│                                                     │                       │
└─────────────────────────────────────────────────────┼───────────────────────┘
                                                      │
┌─────────────────────────────────────────────────────┼───────────────────────┐
│                              DATA LAYER             │                        │
├─────────────────────────────────────────────────────┼───────────────────────┤
│                                                     │                        │
│  ┌──────────────┐                                   │                        │
│  │   players    │                                   │                        │
│  │──────────────│                                   │                        │
│  │ id           │◄──────────────────┐               │                        │
│  │ first_name   │                   │               │                        │
│  │ last_name    │                   │               │                        │
│  │ position     │                   │               │                        │
│  │ player_match_key                 │               │                        │
│  └──────────────┘                   │               │                        │
│         │                           │               │                        │
│         │                   ┌───────┴───────────────┴────────┐              │
│         │                   │                                │              │
│         │                   ▼                                ▼              │
│         │         ┌─────────────────────┐         ┌──────────────────┐     │
│         │         │ player_acquisitions │         │ keeper_selections│     │
│         │         │─────────────────────│         │──────────────────│     │
│         │         │ player_id           │◄────────│ player_id        │     │
│         └────────>│ team_id             │         │ team_id          │     │
│                   │ slot_id             │         │ slot_id          │     │
│                   │ season_year         │         │ season_year      │     │
│                   │ acquisition_type    │         │ keeper_round     │     │
│                   │ draft_round         │         │ is_finalized     │     │
│                   │ dropped_date        │         │ original_acquisition_id│
│                   └─────────────────────┘         └──────────────────┘     │
│                                                                             │
│         ┌──────────────────┐              ┌──────────────┐                  │
│         │ keeper_overrides │              │ league_rules │                  │
│         │──────────────────│              │──────────────│                  │
│         │ player_id        │              │ code         │                  │
│         │ team_id          │              │ name         │                  │
│         │ slot_id          │              │ effective_season               │
│         │ season_year      │              │ enabled      │                  │
│         │ override_round   │              │              │                  │
│         └──────────────────┘              └──────────────┘                  │
│                                                                             │
│         ┌──────────────┐                                                    │
│         │  audit_logs  │                                                    │
│         │──────────────│                                                    │
│         │ user_id      │                                                    │
│         │ action       │                                                    │
│         │ entity_type  │                                                    │
│         │ entity_id    │                                                    │
│         └──────────────┘                                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Cardinality:**
- `team_slots` 1:N `team_aliases` (one slot has many name aliases)
- `team_slots` 1:N `teams` (one slot has one team per season)
- `team_slots` 1:N `draft_orders` (one slot has one draft position per season)
- `team_slots` 1:N `player_acquisitions` (one slot has many acquisitions)
- `players` 1:N `player_acquisitions` (one player can be acquired multiple times)
- `teams` 1:N `player_acquisitions` (one team has many acquisitions per season)
- `teams` 1:N `keeper_selections` (one team has up to 5 keepers per season)
- `users` 1:1 `team_slots` (one user manages one slot)

---

## Tables Reference

### users

User accounts for authentication and authorization.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | String (cuid) | No | auto | Primary key |
| `email` | String | No | - | Unique email address |
| `password_hash` | String | No | - | bcrypt hashed password |
| `display_name` | String | No | - | User's display name |
| `is_commissioner` | Boolean | No | `false` | Admin access flag |
| `created_at` | DateTime | No | `now()` | Record creation time |
| `updated_at` | DateTime | No | auto | Last update time |

**Indexes:** `email` (unique)

---

### team_slots

Permanent franchise positions (1-10). These never change.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | Int | No | - | Primary key (1-10) |
| `manager_id` | String | Yes | - | FK to users.id |
| `created_at` | DateTime | No | `now()` | Record creation time |

**Notes:** Only 10 records exist. `manager_id` links current owner.

---

### team_aliases

Maps team names to slots with year ranges. Handles CBS retroactive renaming.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | String (cuid) | No | auto | Primary key |
| `slot_id` | Int | No | - | FK to team_slots.id |
| `team_name` | String | No | - | Team name string |
| `valid_from` | Int | No | - | Year this name started |
| `valid_to` | Int | Yes | - | Year this name ended (null = current) |
| `created_at` | DateTime | No | `now()` | Record creation time |

**Indexes:** `(slot_id, team_name)` (unique)

**Example:**
| slot_id | team_name | valid_from | valid_to |
|---------|-----------|------------|----------|
| 5 | Discount Belichick | 2023 | 2024 |
| 5 | Seal Team Nix | 2025 | NULL |

---

### teams

Season-specific team records. Created per slot per season.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | String (cuid) | No | auto | Primary key |
| `slot_id` | Int | No | - | FK to team_slots.id |
| `team_name` | String | No | - | Team name for this season |
| `season_year` | Int | No | - | Season year (e.g., 2025) |
| `draft_position` | Int | No | - | Draft order position (1-10) |
| `manager_id` | String | Yes | - | FK to users.id |
| `created_at` | DateTime | No | `now()` | Record creation time |
| `updated_at` | DateTime | No | auto | Last update time |

**Indexes:** `(slot_id, season_year)` (unique)

---

### draft_orders

Draft position assignments per slot per season.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | String (cuid) | No | auto | Primary key |
| `slot_id` | Int | No | - | FK to team_slots.id |
| `season_year` | Int | No | - | Season year |
| `position` | Int | No | - | Draft position (1-10) |
| `created_at` | DateTime | No | `now()` | Record creation time |
| `updated_at` | DateTime | No | auto | Last update time |

**Indexes:**
- `(slot_id, season_year)` (unique) - One position per slot per season
- `(season_year, position)` (unique) - No duplicate positions per season

---

### players

Master player list. Deduplicated by `player_match_key`.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | String (cuid) | No | auto | Primary key |
| `first_name` | String | No | - | Player first name |
| `last_name` | String | No | - | Player last name |
| `position` | String | No | - | Position (QB, RB, WR, TE, K, DL, LB, DB) |
| `player_match_key` | String | No | - | Deduplication key (lowercase name) |
| `created_at` | DateTime | No | `now()` | Record creation time |
| `updated_at` | DateTime | No | auto | Last update time |

**Indexes:** `player_match_key` (unique)

**Match Key Format:** `{first_name}_{last_name}_{position}` (lowercase, underscores)

---

### seasons

Season configuration including deadlines.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | String (cuid) | No | auto | Primary key |
| `year` | Int | No | - | Season year (unique) |
| `draft_date` | DateTime | No | - | Scheduled draft date |
| `keeper_deadline` | DateTime | No | - | Deadline for keeper selections |
| `total_rounds` | Int | No | `28` | Number of draft rounds |
| `is_active` | Boolean | No | `false` | Current active season flag |
| `created_at` | DateTime | No | `now()` | Record creation time |
| `updated_at` | DateTime | No | auto | Last update time |

**Indexes:** `year` (unique)

**Note:** Only one season should have `is_active = true` at a time.

---

### player_acquisitions

Core transaction table tracking all player movements.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | String (cuid) | No | auto | Primary key |
| `player_id` | String | No | - | FK to players.id |
| `team_id` | String | No | - | FK to teams.id (legacy) |
| `slot_id` | Int | Yes | - | FK to team_slots.id (primary) |
| `season_year` | Int | No | - | Season year |
| `acquisition_type` | String | No | - | DRAFT, FA, or TRADE |
| `draft_round` | Int | Yes | - | Draft round (if DRAFT) |
| `draft_pick` | Int | Yes | - | Draft pick number (if DRAFT) |
| `acquisition_date` | DateTime | No | - | Date of acquisition |
| `traded_from_team_id` | String | Yes | - | Source team (if TRADE) |
| `dropped_date` | DateTime | Yes | - | Date dropped (null = active) |
| `created_at` | DateTime | No | `now()` | Record creation time |
| `updated_at` | DateTime | No | auto | Last update time |

**Acquisition Types:**
| Type | Description | draft_round | traded_from_team_id |
|------|-------------|-------------|---------------------|
| `DRAFT` | Drafted in annual draft | Required | NULL |
| `FA` | Free agent pickup | NULL | NULL |
| `TRADE` | Traded from another team | NULL | Required |

**Active Roster:** `WHERE dropped_date IS NULL`

---

### keeper_selections

Keeper choices made by managers.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | String (cuid) | No | auto | Primary key |
| `team_id` | String | No | - | FK to teams.id |
| `slot_id` | Int | Yes | - | FK to team_slots.id |
| `player_id` | String | No | - | FK to players.id |
| `season_year` | Int | No | - | Season selecting FOR |
| `keeper_round` | Int | No | - | Round player costs |
| `years_kept` | Int | No | `1` | How many years kept |
| `original_acquisition_id` | String | No | - | FK to player_acquisitions.id |
| `is_finalized` | Boolean | No | `false` | Locked for draft |
| `finalized_at` | DateTime | Yes | - | When finalized |
| `created_at` | DateTime | No | `now()` | Record creation time |
| `updated_at` | DateTime | No | auto | Last update time |

**Indexes:** `(team_id, player_id, season_year)` (unique)

**Note:** Round conflicts are allowed temporarily; blocked at finalization.

---

### keeper_overrides

Commissioner overrides for special cases.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | String (cuid) | No | auto | Primary key |
| `player_id` | String | No | - | FK to players.id |
| `team_id` | String | No | - | FK to teams.id |
| `slot_id` | Int | Yes | - | FK to team_slots.id |
| `season_year` | Int | No | - | Season this applies to |
| `override_round` | Int | No | - | Forced keeper round |
| `created_at` | DateTime | No | `now()` | Record creation time |
| `updated_at` | DateTime | No | auto | Last update time |

**Indexes:** `(player_id, team_id, season_year)` (unique)

**Use Case:** Trade involving draft pick compensation (e.g., "Player X traded for a 1st rounder, so keeper cost is R1").

---

### league_rules

Configurable rule flags.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | String (cuid) | No | auto | Primary key |
| `code` | String | No | - | Rule identifier (unique) |
| `name` | String | No | - | Human-readable name |
| `description` | String | No | - | Full explanation |
| `effective_season` | Int | No | - | Year rule was introduced |
| `enabled` | Boolean | No | `true` | Currently active |
| `created_at` | DateTime | No | `now()` | Record creation time |
| `updated_at` | DateTime | No | auto | Last update time |

**Indexes:** `code` (unique)

**Current Rules:**
| Code | Effective Season |
|------|------------------|
| `KEEPER_COST_YEAR_2` | 2023 |
| `KEEPER_COST_YEAR_3_PLUS` | 2023 |
| `KEEPER_INELIGIBILITY` | 2023 |
| `TRUE_FA_ROUND_15` | 2023 |
| `TRADE_INHERITS_COST` | 2023 |
| `FA_INHERITS_DRAFT_ROUND` | 2025 |
| `KEEPER_ROUND_BUMP` | 2023 |

---

### audit_logs

Change tracking for accountability.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | String (cuid) | No | auto | Primary key |
| `user_id` | String | No | - | FK to users.id |
| `action` | String | No | - | Action type (CREATE, UPDATE, DELETE) |
| `entity_type` | String | No | - | Table name |
| `entity_id` | String | No | - | Record ID |
| `details` | String | No | - | JSON details of change |
| `timestamp` | DateTime | No | `now()` | When action occurred |

---

## Relationships

### Foreign Key Summary

| Table | Column | References |
|-------|--------|------------|
| `team_slots` | `manager_id` | `users.id` |
| `team_aliases` | `slot_id` | `team_slots.id` |
| `teams` | `slot_id` | `team_slots.id` |
| `teams` | `manager_id` | `users.id` |
| `draft_orders` | `slot_id` | `team_slots.id` |
| `player_acquisitions` | `player_id` | `players.id` |
| `player_acquisitions` | `team_id` | `teams.id` |
| `player_acquisitions` | `slot_id` | `team_slots.id` |
| `keeper_selections` | `team_id` | `teams.id` |
| `keeper_selections` | `slot_id` | `team_slots.id` |
| `keeper_selections` | `player_id` | `players.id` |
| `keeper_selections` | `original_acquisition_id` | `player_acquisitions.id` |
| `keeper_overrides` | `player_id` | `players.id` |
| `keeper_overrides` | `team_id` | `teams.id` |
| `keeper_overrides` | `slot_id` | `team_slots.id` |
| `audit_logs` | `user_id` | `users.id` |

---

## Indexes & Constraints

### Unique Constraints

| Table | Columns | Purpose |
|-------|---------|---------|
| `users` | `email` | No duplicate emails |
| `team_aliases` | `slot_id, team_name` | No duplicate names per slot |
| `teams` | `slot_id, season_year` | One team per slot per season |
| `draft_orders` | `slot_id, season_year` | One position per slot per season |
| `draft_orders` | `season_year, position` | No duplicate positions per season |
| `players` | `player_match_key` | Deduplication |
| `seasons` | `year` | One config per year |
| `keeper_selections` | `team_id, player_id, season_year` | No duplicate keeper per player |
| `keeper_overrides` | `player_id, team_id, season_year` | One override per player per team per year |
| `league_rules` | `code` | Unique rule identifiers |

### Implicit Indexes

Prisma creates indexes for all unique constraints and foreign keys automatically.

---

## Naming Conventions

| Convention | Example |
|------------|---------|
| Table names | `snake_case`, plural (`player_acquisitions`) |
| Column names | `snake_case` (`season_year`, `draft_round`) |
| Primary keys | `id` (cuid string) or `id` (int for slots) |
| Foreign keys | `{entity}_id` (`player_id`, `team_id`) |
| Timestamps | `created_at`, `updated_at` |
| Booleans | `is_` prefix (`is_active`, `is_finalized`) |

### Prisma Field Mapping

Prisma uses camelCase in code, mapped to snake_case in database:
```typescript
// Prisma model
seasonYear    Int    @map("season_year")
keeperRound   Int    @map("keeper_round")
isFinalized   Boolean @map("is_finalized")
```

---

## Common Query Patterns

### Get Active Roster for Slot
```sql
SELECT p.*, pa.*
FROM player_acquisitions pa
JOIN players p ON pa.player_id = p.id
WHERE pa.slot_id = ?
  AND pa.season_year = ?
  AND pa.dropped_date IS NULL
ORDER BY p.last_name;
```

### Get Team Name for Slot + Year
```sql
SELECT team_name
FROM team_aliases
WHERE slot_id = ?
  AND valid_from <= ?
  AND (valid_to IS NULL OR valid_to >= ?)
LIMIT 1;
```

### Get Draft Order for Season
```sql
SELECT ts.id as slot_id, do.position, ta.team_name
FROM team_slots ts
JOIN draft_orders do ON ts.id = do.slot_id AND do.season_year = ?
LEFT JOIN team_aliases ta ON ts.id = ta.slot_id AND ta.valid_to IS NULL
ORDER BY do.position;
```

### Find Player's Acquisition History on Slot
```sql
SELECT *
FROM player_acquisitions
WHERE player_id = ?
  AND slot_id = ?
ORDER BY season_year ASC, acquisition_date ASC;
```

### Get Keeper Selections with Player Details
```sql
SELECT ks.*, p.first_name, p.last_name, p.position
FROM keeper_selections ks
JOIN players p ON ks.player_id = p.id
WHERE ks.team_id = ?
  AND ks.season_year = ?
ORDER BY ks.keeper_round;
```

### Check for Override
```sql
SELECT override_round
FROM keeper_overrides
WHERE player_id = ?
  AND team_id = ?
  AND season_year = ?
LIMIT 1;
```

---

## Sample Data

### team_slots (10 records)

| id | manager_id |
|----|------------|
| 1 | NULL |
| 2 | NULL |
| ... | ... |
| 10 | clx123... (Justin) |

### team_aliases (sample)

| slot_id | team_name | valid_from | valid_to |
|---------|-----------|------------|----------|
| 10 | Gatordontplay | 2023 | 2024 |
| 10 | Gatordontplayanymorebchesucked | 2024 | 2024 |
| 10 | Nabers Think I'm Selling Dope | 2025 | NULL |

### player_acquisitions (sample)

| player_id | slot_id | season_year | acquisition_type | draft_round | dropped_date |
|-----------|---------|-------------|------------------|-------------|--------------|
| clxABC... | 10 | 2023 | DRAFT | 19 | NULL |
| clxABC... | 10 | 2024 | DRAFT | 19 | NULL |
| clxABC... | 10 | 2025 | FA | NULL | NULL |

This shows Danielle Hunter: drafted R19 in 2023, kept in 2024 (CBS creates DRAFT record), picked up as FA in 2025 (chain broken).

---

## Data Integrity Rules

### Business Rules Enforced by Schema

| Rule | Enforcement |
|------|-------------|
| One manager per slot | `team_slots.manager_id` is singular |
| One team per slot per season | Unique constraint `(slot_id, season_year)` |
| No duplicate draft positions | Unique constraint `(season_year, position)` |
| No duplicate keeper selections | Unique constraint `(team_id, player_id, season_year)` |
| Players deduplicated | Unique constraint on `player_match_key` |

### Business Rules Enforced by Application

| Rule | Enforcement |
|------|-------------|
| Max 5 keepers per team | Checked in `selection-service.ts` |
| No round conflicts at finalization | Checked in `finalizeSelections()` |
| Deadline enforcement | Checked in keeper API routes |
| Active roster = `dropped_date IS NULL` | Filtered in queries |

---

## Known Data Issues

### 1. Orphaned Active Acquisitions

**Issue:** Some players have multiple active acquisitions (all with `dropped_date = NULL`) from before bug fixes were implemented.

**Example:** Sam LaPorta has:
- 2023 FA on Slot 3 (should have `dropped_date` set)
- 2024 DRAFT on Slot 4 (should have `dropped_date` set)
- 2025 DRAFT on Slot 4 (current, correct)

**Impact:** Minor - affects historical queries but not current keeper calculations.

**Resolution:** Run cleanup script to set `dropped_date` on old acquisitions when player has newer acquisition on different slot.

### 2. Dual slotId/teamId References

**Issue:** `player_acquisitions`, `keeper_selections`, and `keeper_overrides` have both `team_id` (legacy) and `slot_id` (new). Some older records may have `slot_id = NULL`.

**Impact:** None currently - backfill script populated all `slotId` values.

**Resolution:** Future task (TASK-600d) to make `slot_id` required and deprecate `team_id`.

---

## Migration Approach

### Prisma Migrations

Development uses `prisma db push` for rapid iteration. Production migrations tracked in `prisma/migrations/`.

### Adding New Columns

1. Add to `schema.prisma` as nullable (or with default)
2. Run `npx prisma migrate dev --name description`
3. Backfill data if needed
4. Make non-nullable if appropriate

### Schema Changes Requiring Data Migration

| Change Type | Approach |
|-------------|----------|
| Add nullable column | Direct migration, backfill later |
| Add required column | Add as nullable, backfill, then alter to required |
| Rename column | Create new, copy data, drop old |
| Change type | Create new column, migrate data, drop old |

### Rollback Strategy

Vercel Postgres provides point-in-time recovery. For schema rollbacks:
1. Revert code to previous version
2. Run `npx prisma migrate resolve` if needed
3. Restore database backup if data corrupted

---

## Related Documents

- [Architecture](./ARCHITECTURE.md) - System design overview
- [API Reference](./API.md) - Endpoint documentation
- [Development Guide](./DEVELOPMENT.md) - Local setup

---

**Last Updated:** February 1, 2026
