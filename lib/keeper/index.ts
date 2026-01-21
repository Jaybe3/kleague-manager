// Core calculator
export {
  calculateKeeperCost,
  calculateKeeperProgression,
  getLastEligibleYear,
  canBeKept,
  getKeeperRound,
} from "./calculator";

// Types
export type {
  KeeperCalculationInput,
  KeeperCalculationResult,
  AcquisitionType,
  PlayerKeeperInfo,
  KeeperSelection,
  KeeperValidationResult,
  KeeperValidationError,
} from "./types";

export {
  FA_BASE_ROUND,
  COST_REDUCTION_PER_YEAR,
  MIN_KEEPER_ROUND,
  YEARS_AT_BASE_COST,
} from "./types";

// Database integration
export { getTeamEligibleKeepers } from "./db";

// Service functions (roster, team lookup)
export {
  getTeamRosterWithKeeperCosts,
  getPlayerKeeperCost,
  getAllTeamsKeeperCosts,
  getKeeperRoundConflicts,
  getCurrentSeasonYear,
  getTeamByManagerId,
} from "./service";

export type {
  PlayerKeeperCostResult,
  TeamRosterWithKeeperCosts,
} from "./service";
