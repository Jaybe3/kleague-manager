# Changelog

All notable changes to KLeague Manager are documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Planned
- Commissioner view any team's roster
- Historical keeper selection backfill
- Draft board export (CSV/PDF)

---

## [1.0.0] - 2026-02-01

### Added
- Documentation restructure with enterprise-grade standards
- Individual task files organized by phase
- Comprehensive docs: README, ARCHITECTURE, DATABASE, API, TESTING, DEPLOYMENT, SECURITY

### Removed
- Deprecated `lib/keepers/` folder (replaced by `lib/keeper/`)
- Legacy monolithic TASKS.md (archived)
- Legacy HANDOFF.md (archived)

---

## [0.9.0] - 2026-01-25

### Added
- Team initialization for future seasons (TASK-700)
- Automatic team record creation when setting draft order

### Fixed
- BUG-002: Cannot set draft order or keepers for future season
- Keeper route pattern standardized to prevent cascade bugs

---

## [0.8.0] - 2026-01-24

### Added
- Rules engine integration with keeper calculator (TASK-603)
- Rule flags fetched from database and passed to calculator

### Fixed
- Slot 10 keeper cost audit (TASK-604)
- Verified all keeper costs calculate correctly

---

## [0.7.0] - 2026-01-21

### Added
- Keeper chain break detection (TASK-601)
- Ownership chain analysis for accurate keeper costs
- Detection of dropped/re-acquired players

### Changed
- Keeper calculation now identifies when chains are broken
- Players who re-enter draft pool start fresh

---

## [0.6.0] - 2026-01-20

### Added
- Phase 6 Slot-Centric Refactor complete
  - TASK-600a: Schema additions (slotId columns)
  - TASK-600b: Data backfill for existing records
  - TASK-600c: Code migration to use slotId

### Changed
- All keeper operations now use slotId (permanent) instead of teamId
- Backward compatible: teamId still populated for legacy support

### Fixed
- Keeper calculations now follow franchise slot, not team name

---

## [0.5.0] - 2026-01-19

### Added
- Complete UI redesign with shadcn/ui and Forest theme
  - TASK-501d: Design system foundation
  - TASK-501e: My Team page restyle
  - TASK-501f: Rules page restyle
  - TASK-501g: Keepers page restyle
  - TASK-501h: Draft Board page restyle
  - TASK-501i: Admin Import page restyle
  - TASK-501j: Admin Draft Order page restyle
  - TASK-501k: Admin Keeper Overrides page restyle
  - TASK-501l: Admin Rules & Seasons pages restyle
  - TASK-501m: Auth pages (Login/Register) restyle

### Changed
- Consistent Forest color theme across all pages
- Mobile-responsive layouts
- Improved navigation with collapsible admin menu

---

## [0.4.1] - 2026-01-18

### Fixed
- TASK-501b: Keepers page N+1 query performance (168 → 9 queries)
- TASK-501c: Keeper override dropdown lazy loading

---

## [0.4.0] - 2026-01-17

### Added
- Manual trade entry (TASK-400)
- Commissioner can record trades between teams
- Trade acquisitions inherit original draft cost

### Fixed
- BUG-001: Keeper selection round conflict not showing error

---

## [0.3.0] - 2026-01-16

### Added
- League Rules Registry (TASK-303)
- Configurable rules stored in database
- Rules page for viewing league rules
- Admin rules management

### Changed
- Keeper calculator accepts rule flags parameter
- Rules can be toggled per season

---

## [0.2.0] - 2026-01-15

### Added
- Admin Keeper Override (TASK-302)
- Commissioner can override keeper costs for special cases
- Draft Board with keeper placements (TASK-301)
- Draft order management (TASK-301)

---

## [0.1.0] - 2026-01-14

### Added
- Draft Board grid display (TASK-300)
- 28 rounds × 10 teams visualization
- Keeper deadline enforcement (TASK-203)
- Deadline state detection (open, warning, closed, finalized)

---

## [0.0.9] - 2026-01-13

### Added
- Keeper Selection Interface (TASK-201)
- Select/deselect keepers
- Round conflict detection
- Bump feature to resolve conflicts
- Finalization with lock

---

## [0.0.8] - 2026-01-12

### Added
- Team Identity System with Slots (TASK-104)
- Permanent franchise positions (1-10)
- TeamAlias table for name mapping
- Handles CBS retroactive renaming

---

## [0.0.7] - 2026-01-11

### Added
- Flexible Data Import Parser (TASK-105)
- Support for draft picks and FA transactions
- Team name resolution via aliases

---

## [0.0.6] - 2026-01-10

### Changed
- Complete Keeper Acquisition Logic Rewrite (TASK-103-FINAL)
- Correct handling of CBS "kept player" DRAFT records
- Chain detection across seasons
- Accurate base acquisition identification

---

## [0.0.5] - 2026-01-09

### Fixed
- Keeper Cost Rule Corrections (TASK-103)
- Year 2 = base cost (not reduced)
- Year 3+ = -4 per year
- Free agents start at R15

---

## [0.0.4] - 2026-01-08

### Added
- My Team Page (TASK-102)
- View roster with keeper costs
- Player eligibility display

---

## [0.0.3] - 2026-01-07

### Added
- Keeper Cost Calculation Engine (TASK-101)
- Pure function calculator
- 33 unit tests covering all scenarios
- Support for DRAFT, FA, TRADE acquisition types

---

## [0.0.2] - 2026-01-06

### Added
- Excel Import Parser (TASK-100)
- Parse CBS draft data
- Create player and acquisition records

---

## [0.0.1] - 2026-01-05

### Added
- Initial project setup (TASK-000)
- Next.js 14 with App Router
- Database schema design (TASK-001)
- Prisma ORM configuration
- Authentication system (TASK-002)
- NextAuth.js with credentials provider
- User registration and login

---

## Version History Summary

| Version | Date | Highlights |
|---------|------|------------|
| 1.0.0 | 2026-02-01 | Documentation restructure, production ready |
| 0.9.0 | 2026-01-25 | Future season support |
| 0.8.0 | 2026-01-24 | Rules engine integration |
| 0.7.0 | 2026-01-21 | Chain break detection |
| 0.6.0 | 2026-01-20 | Slot-centric refactor |
| 0.5.0 | 2026-01-19 | Complete UI redesign |
| 0.4.0 | 2026-01-17 | Trade entry, bug fixes |
| 0.3.0 | 2026-01-16 | Rules registry |
| 0.2.0 | 2026-01-15 | Admin overrides, draft board |
| 0.1.0 | 2026-01-14 | Draft board, deadlines |
| 0.0.9 | 2026-01-13 | Keeper selection UI |
| 0.0.1 | 2026-01-05 | Initial release |

---

**Last Updated:** February 1, 2026
