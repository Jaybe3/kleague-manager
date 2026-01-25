import type { KeeperCalculationInput, KeeperCalculationResult, KeeperRuleFlags } from "./types";
import {
  FA_BASE_ROUND,
  COST_REDUCTION_PER_YEAR,
  MIN_KEEPER_ROUND,
  YEARS_AT_BASE_COST,
  DEFAULT_RULE_FLAGS,
} from "./types";

/**
 * Calculate keeper cost for a player
 *
 * RULES (controlled by ruleFlags):
 * - Drafted players: Keep at draft round for Y2, then -4 per year starting Y3
 * - Free agents: Keep at round 15 for Y2, then -4 per year starting Y3
 * - Trades: Use original acquisition (draft or FA), trade doesn't reset clock
 * - Ineligible: If calculated round < 1 (when keeperIneligibility enabled)
 *
 * @param input - Calculation input with acquisition info and target year
 * @param ruleFlags - Optional rule flags (defaults to all rules enabled)
 * @returns Calculation result with keeper round or ineligibility
 */
export function calculateKeeperCost(
  input: KeeperCalculationInput,
  ruleFlags: KeeperRuleFlags = DEFAULT_RULE_FLAGS
): KeeperCalculationResult {
  const { acquisitionType, originalDraftRound, acquisitionYear, targetYear } = input;

  // Validate target year is after acquisition year
  if (targetYear <= acquisitionYear) {
    return {
      targetYear,
      acquisitionType,
      originalDraftRound,
      acquisitionYear,
      yearsKept: 0,
      keeperRound: null,
      isEligible: false,
      ineligibleReason: "Target year must be after acquisition year",
      baseRound: acquisitionType === "DRAFT" ? (originalDraftRound ?? 0) : FA_BASE_ROUND,
      costReduction: 0,
    };
  }

  // Determine base round
  // - DRAFT: use the draft round
  // - FA: use FA_BASE_ROUND (15) if trueFaRound15 enabled, otherwise use draft round if inherited
  const baseRound =
    acquisitionType === "DRAFT"
      ? originalDraftRound ?? 0
      : ruleFlags.trueFaRound15
        ? FA_BASE_ROUND
        : (originalDraftRound ?? FA_BASE_ROUND); // Fall back to 15 if no inherited round

  // Validate base round for drafted players
  if (acquisitionType === "DRAFT" && (baseRound < 1 || baseRound > 28)) {
    return {
      targetYear,
      acquisitionType,
      originalDraftRound,
      acquisitionYear,
      yearsKept: 0,
      keeperRound: null,
      isEligible: false,
      ineligibleReason: `Invalid draft round: ${baseRound}`,
      baseRound,
      costReduction: 0,
    };
  }

  // Calculate years kept
  // Year 1 = first year after acquisition (first keeper year)
  // Example: Acquired 2024, Target 2025 -> yearsKept = 1
  const yearsKept = targetYear - acquisitionYear;

  // Calculate cost reduction (only if keeperCostYear3Plus rule is enabled)
  // - Year 1 (Y2): No reduction (keep at base round)
  // - Year 2+ (Y3+): Reduce by 4 for each year beyond year 1 (if rule enabled)
  //   Y3: -4, Y4: -8, Y5: -12, etc.
  let costReduction = 0;
  if (ruleFlags.keeperCostYear3Plus && yearsKept > YEARS_AT_BASE_COST) {
    costReduction = COST_REDUCTION_PER_YEAR * (yearsKept - YEARS_AT_BASE_COST);
  }

  // Calculate keeper round
  const calculatedRound = baseRound - costReduction;

  // Check eligibility (only if keeperIneligibility rule is enabled)
  // Player is ineligible if calculated round < MIN_KEEPER_ROUND (1)
  const isEligible = ruleFlags.keeperIneligibility
    ? calculatedRound >= MIN_KEEPER_ROUND
    : true; // If rule disabled, always eligible
  const keeperRound = isEligible ? calculatedRound : null;
  const ineligibleReason = isEligible
    ? undefined
    : `Keeper cost (${calculatedRound}) is less than round 1 - player is no longer eligible`;

  return {
    targetYear,
    acquisitionType,
    originalDraftRound,
    acquisitionYear,
    yearsKept,
    keeperRound,
    isEligible,
    ineligibleReason,
    baseRound,
    costReduction,
  };
}

/**
 * Calculate keeper costs for multiple years (projection)
 *
 * @param input - Base calculation input (uses acquisitionYear and acquisitionType)
 * @param startYear - First year to calculate
 * @param endYear - Last year to calculate
 * @param ruleFlags - Optional rule flags (defaults to all rules enabled)
 * @returns Array of calculation results for each year
 */
export function calculateKeeperProgression(
  input: Omit<KeeperCalculationInput, "targetYear">,
  startYear: number,
  endYear: number,
  ruleFlags: KeeperRuleFlags = DEFAULT_RULE_FLAGS
): KeeperCalculationResult[] {
  const results: KeeperCalculationResult[] = [];

  for (let year = startYear; year <= endYear; year++) {
    results.push(
      calculateKeeperCost({
        ...input,
        targetYear: year,
      }, ruleFlags)
    );
  }

  return results;
}

/**
 * Get the last year a player is eligible to be kept
 *
 * @param input - Base calculation input
 * @returns The last year the player can be kept, or null if never eligible
 */
export function getLastEligibleYear(
  input: Omit<KeeperCalculationInput, "targetYear">
): number | null {
  const { acquisitionYear, acquisitionType, originalDraftRound } = input;

  const baseRound =
    acquisitionType === "DRAFT"
      ? originalDraftRound ?? 0
      : FA_BASE_ROUND;

  if (baseRound < MIN_KEEPER_ROUND) {
    return null; // Never eligible
  }

  // Year 1 (Y2): Always eligible at base round
  // Year 2+ (Y3+): Eligible while baseRound - (4 * (yearsKept - 1)) >= 1
  //
  // Solve for yearsKept when baseRound - (4 * (yearsKept - 1)) = 1
  // baseRound - 4*yearsKept + 4 = 1
  // baseRound + 3 = 4*yearsKept
  // yearsKept = (baseRound + 3) / 4
  //
  // But we need the last WHOLE year where it's still >= 1
  // So: baseRound - (4 * (yearsKept - 1)) >= 1
  // baseRound - 1 >= 4 * (yearsKept - 1)
  // (baseRound - 1) / 4 >= yearsKept - 1
  // yearsKept <= (baseRound - 1) / 4 + 1
  // yearsKept <= (baseRound - 1 + 4) / 4
  // yearsKept <= (baseRound + 3) / 4

  const maxYearsKept = Math.floor((baseRound + 3) / 4);

  // Minimum is 1 year (Y2 at base cost)
  const actualMaxYears = Math.max(maxYearsKept, YEARS_AT_BASE_COST);

  return acquisitionYear + actualMaxYears;
}

/**
 * Determine if a player can be kept in a specific year
 *
 * @param input - Calculation input
 * @param ruleFlags - Optional rule flags (defaults to all rules enabled)
 * @returns true if player is eligible, false otherwise
 */
export function canBeKept(
  input: KeeperCalculationInput,
  ruleFlags: KeeperRuleFlags = DEFAULT_RULE_FLAGS
): boolean {
  return calculateKeeperCost(input, ruleFlags).isEligible;
}

/**
 * Get the keeper round for a player (or null if ineligible)
 *
 * @param input - Calculation input
 * @param ruleFlags - Optional rule flags (defaults to all rules enabled)
 * @returns Keeper round or null
 */
export function getKeeperRound(
  input: KeeperCalculationInput,
  ruleFlags: KeeperRuleFlags = DEFAULT_RULE_FLAGS
): number | null {
  return calculateKeeperCost(input, ruleFlags).keeperRound;
}
