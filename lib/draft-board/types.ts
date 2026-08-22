// Draft Board Types

export interface DraftBoardSeason {
  year: number;
  totalRounds: number;
}

export interface DraftBoardTeam {
  id: string;
  teamName: string;
  slotId: number;
  draftPosition: number; // 1-10, used for column ordering
}

export interface DraftBoardKeeper {
  teamId: string;
  playerId: string;
  playerName: string;
  position: string;
  keeperRound: number; // The round this pick is taken
  // True when another keeper on the same team claims the same round. Only
  // reachable post-deadline, when unsubmitted selections start counting and
  // the submit-time conflict check no longer gates them. Needs a commissioner
  // override to resolve.
  hasConflict?: boolean;
}

export interface DraftBoardResponse {
  season: DraftBoardSeason;
  teams: DraftBoardTeam[];
  keepers: DraftBoardKeeper[];
  availableSeasons: number[];
}

// Helper type for grid rendering
export interface GridCell {
  round: number;
  teamId: string;
  keeper: DraftBoardKeeper | null;
}
