# DEPRECATED - Do Not Use

**This module is deprecated.** Use `@/lib/keeper` instead.

## Migration Guide

| Old Import | New Import |
|------------|------------|
| `import { getTeamRosterWithKeepers } from "@/lib/keepers"` | `import { getTeamRosterWithKeeperCosts } from "@/lib/keeper"` |
| `import { getCurrentSeasonYear } from "@/lib/keepers"` | `import { getCurrentSeasonYear } from "@/lib/keeper"` |
| `import { getTeamByManagerId } from "@/lib/keepers"` | `import { getTeamByManagerId } from "@/lib/keeper"` |
| `import { KeeperCostResult } from "@/lib/keepers/types"` | `import { PlayerKeeperCostResult } from "@/lib/keeper"` |
| `import { RosterWithKeepers } from "@/lib/keepers/types"` | `import { TeamRosterWithKeeperCosts } from "@/lib/keeper"` |

## Why Deprecated?

The old module had bugs:
1. **Off-by-one year calculation** - Year 2 was applying -4 reduction instead of keeping base cost
2. **Didn't search all teams for original DRAFT** - Only looked at current team's acquisitions
3. **Incorrect `YEARS_AT_BASE_COST`** - Was set to 2 instead of 1

The new `lib/keeper/` module fixes all these issues.

## Removal Plan

This folder will be removed in a future update. Do not add new imports.

**Deprecated:** January 20, 2026
