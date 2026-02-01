# Testing

This document describes the testing strategy, current coverage, and how to run tests for KLeague Manager.

**Audience:** Developers, QA

---

## Table of Contents

1. [Overview](#overview)
2. [Test Framework](#test-framework)
3. [Running Tests](#running-tests)
4. [Current Coverage](#current-coverage)
5. [Test Philosophy](#test-philosophy)
6. [Unit Tests](#unit-tests)
7. [Integration Testing](#integration-testing)
8. [Manual Verification](#manual-verification)
9. [Adding New Tests](#adding-new-tests)
10. [Future Testing Plans](#future-testing-plans)

---

## Overview

| Metric | Value |
|--------|-------|
| Test Framework | Vitest |
| Test Files | 1 |
| Test Cases | 33 |
| Coverage Area | Keeper cost calculation engine |
| CI/CD Integration | None (manual runs) |

### Current State

Testing is focused on the most critical business logic: the keeper cost calculator. This pure function determines keeper eligibility and costs based on acquisition history and league rules. Given the complexity of keeper rules and the high cost of calculation errors, this is the highest-value area for automated testing.

Other areas (API routes, UI components) are tested manually via verification commands documented in task files.

---

## Test Framework

### Vitest Configuration
```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

### Dependencies
```json
{
  "devDependencies": {
    "vitest": "^1.x.x"
  }
}
```

---

## Running Tests

### All Tests
```bash
npx vitest run
```

### Watch Mode (Development)
```bash
npx vitest
```

### Specific File
```bash
npx vitest run lib/keeper/calculator.test.ts
```

### With Coverage
```bash
npx vitest run --coverage
```

### Expected Output
```
✓ lib/keeper/calculator.test.ts (33 tests) 45ms
  ✓ Keeper Cost Calculator (33 tests)
    ✓ Drafted Player - Round 6 (CRITICAL) (3 tests)
    ✓ Free Agent (CRITICAL) (5 tests)
    ✓ Round 10 - Full Progression (4 tests)
    ✓ Edge Cases (6 tests)
    ✓ Utility Functions (15 tests)

Test Files  1 passed (1)
     Tests  33 passed (33)
```

---

## Current Coverage

### Covered: Keeper Cost Calculator

| Function | Tests | Coverage |
|----------|-------|----------|
| `calculateKeeperCost()` | 18 | All scenarios |
| `calculateKeeperProgression()` | 5 | Full progressions |
| `getLastEligibleYear()` | 4 | Edge cases |
| `canBeKept()` | 3 | Boolean checks |
| `getKeeperRound()` | 3 | Round calculations |

### Test Scenarios

| Scenario | Tested |
|----------|--------|
| Drafted player Year 2 (base cost) | ✓ |
| Drafted player Year 3+ (cost reduction) | ✓ |
| Drafted player ineligibility | ✓ |
| Free agent Year 2 (R15 base) | ✓ |
| Free agent full progression | ✓ |
| Trade (inherits original cost) | ✓ |
| Round 1 pick (immediate ineligibility Y3) | ✓ |
| Round 27/28 late picks | ✓ |
| Rule flag overrides | ✓ |
| Invalid inputs | ✓ |

### Not Covered (Manual Testing)

| Area | Reason |
|------|--------|
| API Routes | Require database; tested via verification commands |
| UI Components | Visual; tested manually |
| Data Import | Complex CBS parsing; tested with real data |
| Authentication | NextAuth.js handles; tested manually |

---

## Test Philosophy

### Why Focus on Calculator?

1. **Pure Function** - No database, no side effects, easy to test exhaustively
2. **High Complexity** - Multiple rules, edge cases, year progressions
3. **High Cost of Errors** - Wrong keeper cost = angry league members
4. **Stable Interface** - Inputs/outputs don't change frequently

### Why Not Full Coverage?

1. **Small Team** - One developer, time-constrained
2. **Low Traffic** - 10 users max, issues caught quickly
3. **Manual Verification** - Task files include verification steps
4. **Integration Complexity** - Database-dependent tests require more infrastructure

---

## Unit Tests

### File: `lib/keeper/calculator.test.ts`

Located at the core of keeper logic. Tests the pure calculation functions.

### Test Structure
```typescript
describe("Keeper Cost Calculator", () => {
  describe("Drafted Player - Round 6 (CRITICAL)", () => {
    it("Y2 (2025): Keep at R6 - same as drafted", () => {
      const result = calculateKeeperCost({
        acquisitionType: "DRAFT",
        originalDraftRound: 6,
        acquisitionYear: 2024,
        targetYear: 2025,
      });
      expect(result.isEligible).toBe(true);
      expect(result.keeperRound).toBe(6);
    });
  });
});
```

### Critical Test Cases

These test cases match real league scenarios and were derived from TASKS.md requirements:

| Test Case | Input | Expected |
|-----------|-------|----------|
| Round 6 Y2 | DRAFT R6, 2024 → 2025 | R6, eligible |
| Round 6 Y3 | DRAFT R6, 2024 → 2026 | R2, eligible |
| Round 6 Y4 | DRAFT R6, 2024 → 2027 | Ineligible |
| FA Y2 | FA 2024 → 2025 | R15, eligible |
| FA Y5 | FA 2024 → 2028 | R3, eligible |
| FA Y6 | FA 2024 → 2029 | Ineligible |
| Trade | TRADE (original R10) | Inherits R10 |

---

## Integration Testing

### Current Approach: Verification Commands

Each completed task includes verification commands that test the integrated system:
```bash
# Example from TASK-201 (Keeper Selection)
curl -X GET http://localhost:3000/api/my-team/keepers \
  -H "Cookie: $SESSION_COOKIE" | jq

# Expected: List of eligible players with correct costs
```

### Database State Verification
```bash
# Check keeper selections
npx prisma studio
# Navigate to KeeperSelection table, verify data
```

### Manual Checklist

When testing a feature manually:

- [ ] API returns expected data
- [ ] UI displays correctly
- [ ] Error cases show appropriate messages
- [ ] Database state is correct after operation
- [ ] No console errors

---

## Manual Verification

### Keeper Selection Flow

1. Log in as a team manager
2. Navigate to /my-team/keepers
3. Verify eligible players show correct costs
4. Select a keeper
5. Verify selection appears in "Selected" list
6. Verify conflict detection (if applicable)
7. Bump a keeper to resolve conflict
8. Finalize selections
9. Verify finalization locks selections
10. Verify draft board shows keepers

### Admin Flow

1. Log in as commissioner
2. Navigate to /admin/draft-order
3. Set draft order for season
4. Navigate to /admin/import
5. Import draft data (copy from CBS)
6. Verify players created
7. Navigate to /admin/keeper-overrides
8. Create an override
9. Verify manager sees overridden cost

---

## Adding New Tests

### When to Add Tests

| Scenario | Action |
|----------|--------|
| New calculator logic | Required - add unit tests |
| New business rule | Required - add unit tests |
| Bug fix in calculator | Required - add regression test |
| New API endpoint | Optional - document verification commands |
| UI changes | Optional - manual testing sufficient |

### Test File Location
```
lib/
├── keeper/
│   ├── calculator.ts       # Implementation
│   ├── calculator.test.ts  # Tests
│   └── types.ts            # Shared types
```

### Test Template
```typescript
import { describe, it, expect } from "vitest";
import { functionToTest } from "./module";

describe("Feature Name", () => {
  describe("Scenario", () => {
    it("should do X when Y", () => {
      const result = functionToTest(input);
      expect(result).toBe(expected);
    });
  });
});
```

---

## Future Testing Plans

### Planned Improvements

| Priority | Item | Effort |
|----------|------|--------|
| Medium | Add test script to package.json | 5 min |
| Medium | CI/CD integration (GitHub Actions) | 2 hrs |
| Low | API route tests with test database | 4 hrs |
| Low | E2E tests with Playwright | 8 hrs |

### Backlog Task

**TASK-500: End-to-End Testing** is in the backlog for comprehensive test coverage when time permits.

### Recommended CI/CD Setup
```yaml
# .github/workflows/test.yml (future)
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npx vitest run
```

---

## Related Documents

- [Development Guide](./DEVELOPMENT.md) - Local setup
- [Architecture](./ARCHITECTURE.md) - System design
- [tasks/backlog/TASK-500.md](../tasks/backlog/TASK-500.md) - E2E testing task

---

**Last Updated:** February 1, 2026
