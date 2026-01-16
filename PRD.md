# Product Requirements Document (PRD)
## Fantasy Football Keeper League Management System

**Version:** 1.0  
**Last Updated:** January 14, 2026  
**Project Code Name:** KLeague Manager

---

## 1. Executive Summary

### 1.1 Problem Statement
A 10-team fantasy football keeper league on CBS Sports has complex multi-year keeper rules that CBS cannot natively support. Currently managed through Excel spreadsheets, this manual process is error-prone, lacks transparency for league members, and creates significant overhead for the commissioner.

### 1.2 Solution Overview
A web application that manages keeper eligibility, tracks multi-year player costs, handles free agent keeper rules, and provides a transparent draft board view for all league members.

### 1.3 Success Criteria
- Eliminate manual Excel management for keeper tracking
- Provide transparent view of draft board with keeper selections
- Reduce commissioner workload by 80% during keeper selection period
- Zero keeper rule violations during draft
- All 10 team managers successfully submit keepers through the app

---

## 2. Keeper Cost Calculation Rules (CRITICAL)

### Drafted Player Rules
```
Year 1 (Draft year): Player drafted at Round X
Year 2 (First keeper year): Keep at Round X (same as drafted)
Year 3 (Second keeper year): Keep at Round (X - 4) — FIRST REDUCTION
Year 4 (Third keeper year): Keep at Round (X - 8)
Year 5+ (Subsequent years): Keep at (Previous year - 4)

Ineligibility: If calculated cost < Round 1, player becomes ineligible
```

**Examples:**
- Round 3 draft: Y2=R3, Y3=INELIGIBLE (R3-4 = R-1)
- Round 6 draft: Y2=R6, Y3=R2, Y4=INELIGIBLE (R2-4 = R-2)
- Round 10 draft: Y2=R10, Y3=R6, Y4=R2, Y5=INELIGIBLE

### Free Agent Rules
```
Year 1 (Pickup year): Player acquired as free agent during season
Year 2 (First keeper year): Keep at Round 15 (FA base cost)
Year 3 (Second keeper year): Keep at Round 11 (15 - 4)
Year 4 (Third keeper year): Keep at Round 7 (11 - 4)
Year 5+ (Subsequent years): Continue -4 per year until ineligible
```

**Example:** FA signed Y1 → Y2=R15, Y3=R11, Y4=R7, Y5=R3, Y6=INELIGIBLE

### Dropped Player Rules (Added 2026-01-16)
- Once drafted, a player ALWAYS retains original draft year/round for keeper cost
- Even if dropped and re-acquired by different team
- FA Round 15 ONLY applies to players NEVER drafted by anyone

### Trade Rules
When a player is traded:
- Player retains original draft year and round
- Receiving team inherits keeper cost as if they had drafted the player
- Trade does NOT reset the keeper clock

---

## 3. Core Features

- **28 rounds × 10 teams** draft board
- **Keeper conflict resolution** - handle multiple FAs at same round
- **Deadline enforcement** - lock selections after deadline
- **Commissioner admin panel** - import data, manage teams, enter trades
- **Team manager dashboard** - select keepers, view eligibility

---

## 4. Technical Stack

- Next.js 14 + TypeScript
- PostgreSQL (via Prisma ORM)
- NextAuth.js for authentication
- Vercel hosting (free tier)

---

**Document Status:** APPROVED  
**Next Steps:** Begin TASK-000 (Project Setup)
