// ============= Excel Row Types =============

export interface DraftSheetRow {
  "Rnd/Pk": string; // e.g., " 1/1"
  Team: string;
  Player: string;
  "Elapsed Time"?: unknown;
  Rank?: string;
  "Total Fpts"?: number;
  "Active Fpts"?: number;
  Keeper: boolean;
  "2024Round": string;
  "2025Round": string;
  First: string;
  Last: string;
  Position: string;
  Blank?: string;
  Team2?: string;
  Column6?: string;
  PlayerMatch: string;
  Dropped: boolean;
}

export interface TransactionSheetRow {
  Date: string; // e.g., "  12/29/24 12:38 PM ET"
  Team: string;
  PlayerMatch: string;
  First: string;
  Last: string;
  Position: string;
  Break?: string;
  Team2?: string;
  "N/A"?: string;
  Type: "Signed" | "Dropped" | "Traded";
}

export interface RosterSheetRow {
  Team: string;
  Pos: string;
  First: string;
  Last: string;
  Position: string;
  Blank?: string;
  Team2?: string;
  PosRnk?: number;
  PlayerMatch: string;
  Rost?: number;
  Start?: number;
  "Prd. 22"?: number;
  Avg?: number;
  Proj?: number;
  "2024Transactions": string;
  "2025Draft": number | string;
  Keeper: "Y" | "N";
}

export interface DraftOrderRow {
  Round: number;
  Pick: number;
  Team: string;
  PlayerMatch: string;
}

// ============= Parsed Data Types =============

export interface ParsedPlayer {
  playerMatchKey: string;
  firstName: string;
  lastName: string;
  position: string;
}

export interface ParsedDraftPick {
  player: ParsedPlayer;
  teamName: string;
  seasonYear: number;
  draftRound: number;
  draftPick: number;
  wasKeptIn2024: boolean;
  round2024: number | null;
  round2025: number | null;
  isDropped: boolean;
}

export interface ParsedTransaction {
  player: ParsedPlayer;
  teamName: string;
  seasonYear: number;
  transactionType: "FA" | "TRADE" | "DROP";
  transactionDate: Date;
}

export interface ParsedKeeperSlot {
  playerMatchKey: string;
  teamName: string;
  round: number;
  pick: number;
}

// ============= Import Result Types =============

export interface ImportResult {
  success: boolean;
  imported: {
    season: { year: number } | null;
    teams: number;
    players: number;
    draftPicks: number;
    faSignings: number;
  };
  skipped: {
    drops: number;
    duplicates: number;
    invalid: number;
  };
  errors: string[];
  warnings: string[];
}

export interface TeamMapping {
  permanentId: number;
  canonicalName: string;
  aliases: string[];
}

// ============= Acquisition Types =============

export type AcquisitionType = "DRAFT" | "FA" | "TRADE";

// ============= Import Types =============

export type ImportType = "draft" | "fa";

export interface SingleImportResult {
  success: boolean;
  importType: ImportType;
  seasonYear: number;
  imported: {
    teams: number;
    players: number;
    acquisitions: number;
  };
  skipped: {
    duplicates: number;
    invalid: number;
  };
  errors: string[];
  warnings: string[];
}

// ============= Trade Entry Types =============

export interface TradeEntry {
  playerMatchKey: string;
  playerFirstName: string;
  playerLastName: string;
  playerPosition: string;
  fromTeamName: string;
  toTeamName: string;
  tradeDate: Date;
  seasonYear: number;
}
