# TASK-303: League Rules Registry

**Status:** COMPLETED
**Created:** January 2026
**Completed:** 2026-01-21
**Priority:** Medium
**Depends On:** TASK-103-FINAL
**Phase:** Phase 3 - Draft Board

---

## Objective

Create a registry of league rules with effective seasons, allowing rules to be toggled and documented for transparency.

---

## Background

The league has several rules that govern keeper costs, trades, and other mechanics. These rules need to be:
- Documented for all members to reference
- Versioned with effective seasons (some rules added later)
- Toggleable by the commissioner
- Eventually integrated into the keeper calculation

---

## Specification

### Use Cases
- League members can view all rules and when they took effect
- Commissioner can enable/disable rules per season
- Keeper calculation checks if rules are active before applying
- New rules can be added without code changes

### Database Model

```prisma
model LeagueRule {
  id              String   @id @default(cuid())
  code            String   @unique                    // e.g., "KEEPER_COST_YEAR_2"
  name            String                              // Human-readable name
  description     String                              // Full rule explanation
  effectiveSeason Int      @map("effective_season")   // Year rule was introduced
  enabled         Boolean  @default(true)
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@map("league_rules")
}
```

### Seed Data (7 Rules)

**Effective 2023 (Founding Rules):**

| Code | Name | Description |
|------|------|-------------|
| `KEEPER_COST_YEAR_2` | Year 2 Base Cost | First keeper year: keep at original draft round (or R15 for FA) |
| `KEEPER_COST_YEAR_3_PLUS` | Year 3+ Reduction | Second+ keeper year: cost reduces by 4 rounds per year |
| `KEEPER_INELIGIBILITY` | Keeper Ineligibility | Player becomes ineligible when calculated cost < Round 1 |
| `TRUE_FA_ROUND_15` | True FA Round 15 | Players never drafted use Round 15 as keeper base |
| `TRADE_INHERITS_COST` | Trade Inherits Cost | Traded players retain original draft year/round for keeper calculation |

**Effective 2025 (New Rules):**

| Code | Name | Description |
|------|------|-------------|
| `FA_INHERITS_DRAFT_ROUND` | FA Inherits Draft Round | FA pickup of a player drafted same season inherits that draft round |
| `KEEPER_ROUND_BUMP` | Keeper Round Bump | When two keepers conflict at same round, one must bump to earlier (more expensive) round |

### Features Required

**1. Public Rules Page**
- Location: `/rules`
- All logged-in users can view
- Display all enabled rules grouped by effective season
- Show rule name, description, effective date
- Read-only for non-commissioners

**2. Admin Rules Page**
- Location: `/admin/rules`
- Commissioner only
- Toggle rules enabled/disabled
- Edit rule descriptions
- Add new rules
- Delete rules (with warning for founding rules)

**3. Rules Service**
- `lib/rules/rules-service.ts`
- `isRuleActive(code: string, seasonYear: number): boolean`
- `getRulesByEffectiveSeason(year: number): LeagueRule[]`
- `getAllRules(): LeagueRule[]`

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/rules` | List all enabled rules (public) |
| GET | `/api/admin/rules` | List all rules with enabled status |
| POST | `/api/admin/rules` | Create new rule |
| PATCH | `/api/admin/rules/[id]` | Toggle enabled or update description |
| DELETE | `/api/admin/rules/[id]` | Delete rule |

---

## Technical Approach

1. Add LeagueRule model to schema
2. Create seed script for founding rules
3. Build rules service with helper functions
4. Create public rules page
5. Create admin rules page with CRUD
6. Build API endpoints

---

## Files Created

| File | Purpose |
|------|---------|
| `prisma/seed.ts` | Seed script for 7 rules |
| `lib/rules/rules-service.ts` | Rules service with isRuleActive, getAllRules, etc. |
| `lib/rules/index.ts` | Exports for rules service |
| `app/(dashboard)/rules/page.tsx` | Public rules display page |
| `app/(dashboard)/admin/rules/page.tsx` | Admin rules management page |
| `app/api/rules/route.ts` | GET endpoint (public, authenticated) |
| `app/api/admin/rules/route.ts` | GET/POST endpoints (commissioner) |
| `app/api/admin/rules/[id]/route.ts` | PATCH/DELETE endpoints (commissioner) |

---

## Files Modified

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Added LeagueRule model |
| `package.json` | Added tsx, db:seed script, prisma seed config |
| `app/(dashboard)/my-team/page.tsx` | Added "Rules" link to navigation |

---

## Acceptance Criteria

- [x] LeagueRule table exists in database
- [x] 7 rules seeded with correct effective seasons
- [x] Public /rules page displays all enabled rules
- [x] Rules grouped by effective season on public page
- [x] Admin can toggle rules enabled/disabled
- [x] Admin can edit rule descriptions
- [x] Admin can add new rules
- [x] Admin can delete rules (with warning for founding rules)
- [x] `isRuleActive()` returns correct value based on season and enabled status
- [ ] Keeper calculation respects rule activation (moved to TASK-603)
- [x] Non-commissioners cannot access admin rules page (403)

---

## Verification

### Seed Rules
```bash
npm run db:seed
# Should create 7 rules in database
```

### Public Page Testing
1. Log in as any user
2. Navigate to `/rules`
3. Verify all 7 rules displayed
4. Verify grouped by effective season (2023, 2025)

### Admin Page Testing
1. Log in as commissioner
2. Navigate to `/admin/rules`
3. Toggle a rule enabled/disabled
4. Edit a rule description
5. Add a new rule
6. Delete a rule (verify warning for founding rules)

---

## Completion Notes

League rules registry fully implemented:
- 7 founding rules seeded
- Public page for transparency
- Admin page for management
- Rules service for programmatic access
- `isRuleActive()` function ready for keeper calculation integration

**Note:** Keeper calculation integration moved to TASK-603 (Phase 6) to properly wire rules into the calculation engine.

---

## Related

- [TASK-103-FINAL](../phase-1-import/TASK-103-FINAL.md) - Keeper Calculation Logic (prerequisite)
- [TASK-603](../phase-6-refactor/TASK-603.md) - Rules Engine Integration (uses this)
- [TASK-501f](../phase-5-ui/TASK-501f.md) - Restyle Rules Page
- [TASK-501l](../phase-5-ui/TASK-501l.md) - Restyle Admin Rules Page
