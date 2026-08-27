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

// Keeper status (kept / not kept / pending), shared with the client
export { resolveKeeperStatus, KEEPER_STATUS_RANK } from "./keeper-status";
export type { KeeperStatus, KeeperStatusInput } from "./keeper-status";

// Database integration
export { getTeamEligibleKeepers } from "./db";

// Service functions (roster, team lookup)
export {
  getTeamRosterWithKeeperCosts,
  getPlayerKeeperCost,
  getAllTeamsKeeperCosts,
  getAllPlayersWithKeeperStatus,
  getKeeperRoundConflicts,
  getCurrentSeasonYear,
  getTeamByManagerId,
} from "./service";

export type {
  PlayerKeeperCostResult,
  TeamRosterWithKeeperCosts,
  AllPlayersRow,
} from "./service";
