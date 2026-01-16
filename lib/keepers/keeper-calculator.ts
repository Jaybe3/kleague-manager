// Keeper cost calculation engine
// Rules from PRD.md Section 2

import { AcquisitionType, KeeperCostResult, PlayerAcquisitionData } from "./types";

const MIN_ROUND = 1;
const MAX_ROUND = 28;
const FA_STARTING_ROUND = 15;
const ROUND_PENALTY = 4;

/**
 * Calculate keeper cost for a player based on PRD rules:
 *
 * DRAFTED PLAYERS:
 * - Year 2 (1st keeper): Same round as drafted
 * - Year 3 (2nd keeper): Same round as drafted
 * - Year 4+ (3rd+ keeper): Previous round - 4
 *
 * FREE AGENTS:
 * - Year 2 (1st keeper): Round 15
 * - Year 3 (2nd keeper): Round 15
 * - Year 4+ (3rd+ keeper): Previous round - 4
 *
 * TRADES:
 * - Inherit original acquisition rules (draft round or FA)
 *
 * INELIGIBLE: When calculated cost < Round 1
 */
export function calculateKeeperCost(
  acquisition: PlayerAcquisitionData,
  targetSeasonYear: number,
  previousYearsKept: number = 0
): KeeperCostResult {
  const yearsKept = previousYearsKept;
  const keeperYearNumber = yearsKept + 1; // Next year would be this keeper year

  // Years since acquisition (Year 1 = acquisition year, Year 2 = first keeper year)
  const yearsSinceAcquisition = targetSeasonYear - acquisition.seasonYear;

  // If same year as acquisition, not eligible to keep yet
  if (yearsSinceAcquisition < 1) {
    return buildResult(acquisition, yearsKept, null, false);
  }

  let keeperCost: number;

  if (acquisition.acquisitionType === "FREE_AGENT") {
    keeperCost = calculateFAKeeperCost(yearsSinceAcquisition);
  } else {
    // DRAFT or TRADE (trades inherit original draft round)
    const originalRound = acquisition.draftRound ?? FA_STARTING_ROUND;
    keeperCost = calculateDraftKeeperCost(originalRound, yearsSinceAcquisition);
  }

  // Check eligibility
  const isEligible = keeperCost >= MIN_ROUND;

  return buildResult(
    acquisition,
    yearsKept,
    isEligible ? keeperCost : null,
    isEligible
  );
}

function calculateDraftKeeperCost(originalRound: number, yearsSinceAcquisition: number): number {
  // Year 2 (1st keeper year): Same as draft round
  // Year 3 (2nd keeper year): Same as draft round
  // Year 4+ (3rd+ keeper year): Subtract 4 per year after Year 3

  if (yearsSinceAcquisition <= 2) {
    return originalRound;
  }

  // Years beyond Year 3 get the -4 penalty
  const penaltyYears = yearsSinceAcquisition - 2;
  return originalRound - (penaltyYears * ROUND_PENALTY);
}

function calculateFAKeeperCost(yearsSinceAcquisition: number): number {
  // Year 2 (1st keeper year): Round 15
  // Year 3 (2nd keeper year): Round 15
  // Year 4+ (3rd+ keeper year): Subtract 4 per year after Year 3

  if (yearsSinceAcquisition <= 2) {
    return FA_STARTING_ROUND;
  }

  const penaltyYears = yearsSinceAcquisition - 2;
  return FA_STARTING_ROUND - (penaltyYears * ROUND_PENALTY);
}

function buildResult(
  acquisition: PlayerAcquisitionData,
  yearsKept: number,
  keeperCost: number | null,
  isEligible: boolean
): KeeperCostResult {
  const acquisitionDisplay = getAcquisitionDisplay(
    acquisition.acquisitionType,
    acquisition.draftRound
  );

  return {
    playerId: acquisition.playerId,
    playerName: acquisition.playerName,
    position: acquisition.position,
    acquisitionType: acquisition.acquisitionType,
    originalRound: acquisition.draftRound,
    yearsKept,
    keeperCost,
    isEligible,
    acquisitionYear: acquisition.seasonYear,
    acquisitionDisplay,
  };
}

function getAcquisitionDisplay(type: AcquisitionType, draftRound: number | null): string {
  switch (type) {
    case "DRAFT":
      return `Draft Rd ${draftRound}`;
    case "FREE_AGENT":
      return "Free Agent";
    case "TRADE":
      return draftRound ? `Trade (Rd ${draftRound})` : "Trade (FA)";
    default:
      return "Unknown";
  }
}

/**
 * Batch calculate keeper costs for multiple players
 */
export function calculateRosterKeeperCosts(
  acquisitions: PlayerAcquisitionData[],
  targetSeasonYear: number,
  keeperHistory: Map<string, number> = new Map()
): KeeperCostResult[] {
  return acquisitions.map(acq => {
    const previousYearsKept = keeperHistory.get(acq.playerId) ?? 0;
    return calculateKeeperCost(acq, targetSeasonYear, previousYearsKept);
  });
}
