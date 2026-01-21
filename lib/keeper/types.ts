// ============= Acquisition Types =============

export type AcquisitionType = "DRAFT" | "FA" | "TRADE";

// ============= Calculation Input/Output =============

/**
 * Input for keeper cost calculation
 * This can be used with pure data (no DB) or with player IDs
 */
export interface KeeperCalculationInput {
  /** Type of original acquisition (DRAFT or FA, not TRADE) */
  acquisitionType: "DRAFT" | "FA";

  /** Draft round if drafted, null if FA */
  originalDraftRound: number | null;

  /** Year the player was originally acquired */
  acquisitionYear: number;

  /** Year we want to calculate keeper cost for */
  targetYear: number;
}

/**
 * Result of keeper cost calculation
 */
export interface KeeperCalculationResult {
  /** Year the calculation is for */
  targetYear: number;

  /** Original acquisition type */
  acquisitionType: "DRAFT" | "FA";

  /** Original draft round (null for FA) */
  originalDraftRound: number | null;

  /** Year player was originally acquired */
  acquisitionYear: number;

  /** Number of years player has been/would be kept (1 = first keeper year) */
  yearsKept: number;

  /** The round player can be kept at (null if ineligible) */
  keeperRound: number | null;

  /** Whether player is eligible to be kept */
  isEligible: boolean;

  /** Reason for ineligibility (if applicable) */
  ineligibleReason?: string;

  /** Base round used in calculation (draft round or 15 for FA) */
  baseRound: number;

  /** The cost reduction applied (0 for years 1-2, multiples of 4 for years 3+) */
  costReduction: number;

  /** Whether this cost is from a commissioner override (only visible to commissioner) */
  isOverride?: boolean;
}

// ============= Player Keeper Info (for DB integration) =============

/**
 * Player keeper information from database
 */
export interface PlayerKeeperInfo {
  playerId: string;
  playerMatchKey: string;
  firstName: string;
  lastName: string;
  position: string;

  /** Original acquisition (DRAFT or first FA, not TRADE) */
  originalAcquisition: {
    type: "DRAFT" | "FA";
    draftRound: number | null;
    draftPick: number | null;
    year: number;
    date: Date;
  };

  /** Current team info */
  currentTeam?: {
    teamId: string;
    teamName: string;
    seasonYear: number;
  };

  /** Trade history (if any) */
  tradeHistory: {
    fromTeamId: string;
    toTeamId: string;
    tradeDate: Date;
    seasonYear: number;
  }[];
}

// ============= Validation Types =============

/**
 * Keeper selection for validation
 */
export interface KeeperSelection {
  playerId: string;
  keeperRound: number;
}

/**
 * Result of keeper selection validation
 */
export interface KeeperValidationResult {
  isValid: boolean;
  errors: KeeperValidationError[];
  warnings: string[];
}

/**
 * Keeper validation error
 */
export interface KeeperValidationError {
  playerId: string;
  playerName: string;
  errorType: "INELIGIBLE" | "WRONG_ROUND" | "CONFLICT" | "NOT_ON_TEAM";
  message: string;
  expectedRound?: number;
  actualRound?: number;
}

// ============= Constants =============

/**
 * Free agent base keeper round
 */
export const FA_BASE_ROUND = 15;

/**
 * Cost reduction per year after year 2
 */
export const COST_REDUCTION_PER_YEAR = 4;

/**
 * Minimum (best) keeper round - round 1
 */
export const MIN_KEEPER_ROUND = 1;

/**
 * Number of years at same cost before reduction starts
 * Y2 = base cost, Y3 = first -4 reduction
 */
export const YEARS_AT_BASE_COST = 1;
