// Types for keeper selection - shared between client and server

// ============= DEADLINE TYPES =============

export type DeadlineState = 'open' | 'approaching' | 'urgent' | 'passed';

export interface DeadlineInfo {
  state: DeadlineState;
  message: string;
  deadline: Date;
  canModify: boolean;  // false if passed or already finalized
}

export interface KeeperSelectionInfo {
  id: string;
  player: {
    id: string;
    firstName: string;
    lastName: string;
    position: string;
  };
  calculatedRound: number;  // Original keeper cost from calculator
  finalRound: number;       // After any bump (may equal calculatedRound)
  isBumped: boolean;
  isFinalized: boolean;
}

export interface EligiblePlayer {
  player: {
    id: string;
    firstName: string;
    lastName: string;
    position: string;
  };
  keeperCost: number;
  isSelected: boolean;
}

export interface RoundConflict {
  round: number;
  players: { id: string; name: string }[];
}

export interface KeeperSelectionsResponse {
  team: {
    id: string;
    teamName: string;
    seasonYear: number;
  };
  season: {
    year: number;
    maxKeepers: number;
    keeperDeadline: Date;
  };
  selections: KeeperSelectionInfo[];
  eligiblePlayers: EligiblePlayer[];
  conflicts: RoundConflict[];
  isFinalized: boolean;
  deadlineInfo: DeadlineInfo;
}

export interface SelectPlayerResult {
  success: boolean;
  error?: string;
  selection?: KeeperSelectionInfo;
}

export interface BumpPlayerResult {
  success: boolean;
  error?: string;
  newRound?: number;
}

export interface FinalizeResult {
  success: boolean;
  error?: string;
  finalizedAt?: Date;
}
