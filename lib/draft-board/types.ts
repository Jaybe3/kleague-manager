// Draft Board Types

export interface DraftBoardSeason {
  year: number;
  totalRounds: number;
  maxKeepers: number;
}

export interface DraftBoardTeam {
  id: string;
  teamName: string;
  permanentId: number; // 1-10, used for column ordering
}

export interface DraftBoardKeeper {
  teamId: string;
  playerId: string;
  playerName: string;
  position: string;
  keeperRound: number; // The round this pick is taken
}

export interface DraftBoardResponse {
  season: DraftBoardSeason;
  teams: DraftBoardTeam[];
  keepers: DraftBoardKeeper[];
}

// Helper type for grid rendering
export interface GridCell {
  round: number;
  teamId: string;
  keeper: DraftBoardKeeper | null;
}
