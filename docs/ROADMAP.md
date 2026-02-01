# Roadmap

This document outlines planned features, improvements, and long-term vision for KLeague Manager.

**Audience:** Stakeholders, developers, league members

---

## Table of Contents

1. [Current State](#current-state)
2. [Short-Term (Q1 2026)](#short-term-q1-2026)
3. [Medium-Term (Q2-Q3 2026)](#medium-term-q2-q3-2026)
4. [Long-Term (2027+)](#long-term-2027)
5. [Backlog](#backlog)
6. [Not Planned](#not-planned)
7. [Feature Requests](#feature-requests)

---

## Current State

**Version:** 1.0.0 (Production Ready)

### Completed Capabilities

| Area | Status |
|------|--------|
| Keeper cost calculation engine | ✅ Complete |
| Manager self-service keeper selection | ✅ Complete |
| Round conflict detection and resolution | ✅ Complete |
| Draft board visualization | ✅ Complete |
| Commissioner admin tools | ✅ Complete |
| CBS data import (draft + transactions) | ✅ Complete |
| Team identity system (slots) | ✅ Complete |
| League rules engine | ✅ Complete |
| Mobile-responsive UI | ✅ Complete |
| Authentication and authorization | ✅ Complete |

### Key Metrics

| Metric | Value |
|--------|-------|
| Active seasons | 3 (2023-2025) |
| Registered managers | 4 of 10 |
| Tasks completed | 38 |
| Test coverage | Keeper calculator (33 tests) |

---

## Short-Term (Q1 2026)

### Priority 1: Commissioner Team Viewing

**Goal:** Commissioner can view any team's roster and keeper options.

**Why:** Currently commissioner must log in as each manager to troubleshoot issues or help with selections.

**Scope:**
- Add team selector dropdown on My Team page (commissioner only)
- View roster and keeper costs for selected team
- Read-only (no modifications through this view)

**Effort:** 4-6 hours

**Status:** Not started - needs task creation

---

### Priority 2: Onboard Remaining Managers

**Goal:** All 10 league members have accounts and are linked to their slots.

**Why:** Only 4 of 10 managers currently active. Full adoption needed before 2026 draft.

**Scope:**
- Create accounts for remaining 6 managers
- Link each to their TeamSlot
- Send login credentials
- Provide basic usage guide

**Effort:** 2-3 hours

**Status:** Operational task, not development

---

### Priority 3: 2026 Season Preparation

**Goal:** System ready for 2026 keeper selections.

**Why:** Draft typically in late August/early September.

**Scope:**
- Verify 2025 data fully imported
- Set 2026 season as active
- Configure keeper deadline
- Test keeper selection flow end-to-end

**Effort:** 2-4 hours

**Status:** Blocked until 2025 season ends

---

## Medium-Term (Q2-Q3 2026)

### Historical Keeper Backfill (TASK-600)

**Goal:** Record which players were actually kept in 2024 and 2025.

**Why:** Currently we only track 2026+ selections. Historical data enables trends analysis.

**Scope:**
- Add KeeperSelection records for 2024, 2025
- Commissioner enters historical data manually
- Or infer from acquisition patterns

**Effort:** 4-6 hours

**Status:** Backlog - [TASK-600](../tasks/backlog/TASK-600.md)

---

### Trade Entry Redesign (TASK-601-REDESIGN)

**Goal:** Improve trade recording workflow.

**Why:** Current trade entry is basic. Doesn't handle multi-player trades well.

**Scope:**
- Multi-player trade support
- Trade date picker
- Trade notes/description
- Trade history view

**Effort:** 8-12 hours

**Status:** Backlog - [TASK-601-REDESIGN](../tasks/backlog/TASK-601-REDESIGN.md)

---

### End-to-End Testing (TASK-500)

**Goal:** Automated tests for critical user flows.

**Why:** Currently relies on manual testing. Risk of regressions.

**Scope:**
- Playwright or Cypress setup
- Login flow test
- Keeper selection flow test
- Admin workflows test
- CI/CD integration

**Effort:** 8-12 hours

**Status:** Backlog (not yet created as task file)

---

### Improved Bump UX (TASK-201-REVISIT)

**Goal:** Better user experience for resolving round conflicts.

**Why:** Current bump UI works but is confusing for new users.

**Scope:**
- Clearer conflict visualization
- Suggested bump options
- Preview of draft board impact

**Effort:** 4-6 hours

**Status:** Backlog - [TASK-201-REVISIT](../tasks/backlog/TASK-201-REVISIT.md)

---

## Long-Term (2027+)

### Multi-Platform Import Support

**Goal:** Support data import from ESPN, Yahoo, Sleeper (not just CBS).

**Why:** League may switch platforms, or other leagues may want to use the app.

**Scope:**
- Pluggable parser architecture
- ESPN transaction parser
- Yahoo transaction parser
- Sleeper API integration

**Effort:** 20-40 hours

**Status:** Future consideration

---

### Multi-League Support

**Goal:** Support multiple independent leagues in one application.

**Why:** Could serve other keeper leagues, potential SaaS opportunity.

**Scope:**
- League entity and multi-tenancy
- League-specific rules
- Separate user pools per league
- League admin roles

**Effort:** 40-80 hours

**Status:** Future consideration

---

### Public API

**Goal:** API for third-party integrations.

**Why:** Enable custom tools, bots, integrations.

**Scope:**
- API key authentication
- Rate limiting
- Documentation
- Webhook support

**Effort:** 20-30 hours

**Status:** Future consideration

---

### Mobile App

**Goal:** Native iOS/Android app.

**Why:** Better mobile experience, push notifications.

**Scope:**
- React Native or native development
- Push notifications for deadlines
- Offline roster viewing

**Effort:** 80-120 hours

**Status:** Future consideration - current responsive web approach sufficient

---

## Backlog

Prioritized list of documented tasks awaiting development.

| Task | Priority | Description | Effort |
|------|----------|-------------|--------|
| [TASK-201-REVISIT](../tasks/backlog/TASK-201-REVISIT.md) | Low | Improve bump UX | 4-6 hrs |
| [TASK-303b](../tasks/backlog/TASK-303b.md) | Low | Integrate rules into keeper display | 2-4 hrs |
| [TASK-501a](../tasks/backlog/TASK-501a.md) | Low | Draft board horizontal scroll UX | 2-4 hrs |
| [TASK-600](../tasks/backlog/TASK-600.md) | Low | Backfill historical keeper selections | 4-6 hrs |
| [TASK-600d](../tasks/backlog/TASK-600d.md) | Low | Slot-centric cleanup (tech debt) | 4-6 hrs |
| [TASK-601-REDESIGN](../tasks/backlog/TASK-601-REDESIGN.md) | Low | Redesign trade entry | 8-12 hrs |

### Technical Debt

| Item | Description | Impact |
|------|-------------|--------|
| Dual slotId/teamId | Acquisitions have both columns | Low - works, but adds complexity |
| No TypeScript strict mode | Some `any` types exist | Low - could catch bugs earlier |
| Limited test coverage | Only calculator tested | Medium - risk of regressions |

---

## Not Planned

Features explicitly decided against (for now).

| Feature | Reason |
|---------|--------|
| Live draft tool | Out of scope - CBS handles draft day |
| Player projections | Out of scope - many services do this |
| Trade analyzer | Out of scope - subjective value |
| Chat/messaging | Out of scope - use existing tools (Slack, etc.) |
| Auto-sync with CBS | CBS has no API - manual import only |
| Password reset | Low priority - commissioner can reset manually |

---

## Feature Requests

To request a feature:

1. Discuss with commissioner
2. If approved, create task file in `tasks/backlog/`
3. Follow template in `tasks/templates/TASK-TEMPLATE.md`
4. Update this roadmap

### Requested But Not Yet Documented

| Request | Requester | Status |
|---------|-----------|--------|
| Commissioner view other teams | Justin | Needs task creation |
| Draft board export to PDF | - | Mentioned, not formally requested |

---

## Roadmap Visualization
```
2026 Q1          2026 Q2-Q3         2027+
─────────────────────────────────────────────────►

[Commissioner     [Historical        [Multi-Platform
 Team Viewing]     Backfill]          Import]

[Manager          [Trade             [Multi-League
 Onboarding]       Redesign]          Support]

[2026 Season      [E2E Testing]      [Public API]
 Prep]
                  [Bump UX           [Mobile App]
                   Improvements]
```

---

## Review Cadence

This roadmap is reviewed and updated:
- After each development phase completion
- Before each season (keeper deadline)
- When significant feature requests arise

---

## Related Documents

- [tasks/INDEX.md](../tasks/INDEX.md) - Task dashboard
- [tasks/backlog/](../tasks/backlog/) - Backlog task files
- [CHANGELOG.md](./CHANGELOG.md) - Release history

---

**Last Updated:** February 1, 2026
