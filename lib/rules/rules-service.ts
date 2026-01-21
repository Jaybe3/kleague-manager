import { db } from "@/lib/db";
import type { LeagueRule } from "@prisma/client";

/**
 * Check if a specific rule is active for a given season.
 * A rule is active if:
 * 1. It exists in the database
 * 2. It is enabled
 * 3. The season year is >= the rule's effective season
 *
 * @param code - The rule code (e.g., "KEEPER_COST_YEAR_2")
 * @param seasonYear - The season year to check
 * @returns true if the rule is active, false otherwise
 */
export async function isRuleActive(
  code: string,
  seasonYear: number
): Promise<boolean> {
  const rule = await db.leagueRule.findUnique({
    where: { code },
  });

  if (!rule) {
    return false;
  }

  // Rule must be enabled AND the season must be >= effective season
  return rule.enabled && seasonYear >= rule.effectiveSeason;
}

/**
 * Get all league rules, sorted by effective season and name.
 *
 * @returns All league rules
 */
export async function getAllRules(): Promise<LeagueRule[]> {
  return db.leagueRule.findMany({
    orderBy: [{ effectiveSeason: "asc" }, { name: "asc" }],
  });
}

/**
 * Get all rules that are active for a given season.
 * Active means: enabled AND effectiveSeason <= seasonYear
 *
 * @param seasonYear - The season year to check
 * @returns Rules that are active for the given season
 */
export async function getActiveRules(seasonYear: number): Promise<LeagueRule[]> {
  return db.leagueRule.findMany({
    where: {
      enabled: true,
      effectiveSeason: {
        lte: seasonYear,
      },
    },
    orderBy: [{ effectiveSeason: "asc" }, { name: "asc" }],
  });
}

/**
 * Get rules grouped by their effective season.
 *
 * @param enabledOnly - If true, only return enabled rules
 * @returns Map of effectiveSeason -> rules[]
 */
export async function getRulesGroupedBySeason(
  enabledOnly: boolean = true
): Promise<Map<number, LeagueRule[]>> {
  const rules = enabledOnly
    ? await db.leagueRule.findMany({
        where: { enabled: true },
        orderBy: [{ effectiveSeason: "asc" }, { name: "asc" }],
      })
    : await getAllRules();

  const grouped = new Map<number, LeagueRule[]>();

  for (const rule of rules) {
    const existing = grouped.get(rule.effectiveSeason) ?? [];
    existing.push(rule);
    grouped.set(rule.effectiveSeason, existing);
  }

  return grouped;
}

/**
 * Get a single rule by its code.
 *
 * @param code - The rule code
 * @returns The rule or null if not found
 */
export async function getRuleByCode(code: string): Promise<LeagueRule | null> {
  return db.leagueRule.findUnique({
    where: { code },
  });
}

/**
 * Update a rule's enabled status or description.
 * Only commissioners should call this (enforce at API level).
 *
 * @param id - The rule ID
 * @param data - Fields to update
 * @returns The updated rule
 */
export async function updateRule(
  id: string,
  data: { enabled?: boolean; description?: string }
): Promise<LeagueRule> {
  return db.leagueRule.update({
    where: { id },
    data,
  });
}
