// Keeper cost calculation types

export type AcquisitionType = "DRAFT" | "FREE_AGENT" | "TRADE";

export interface PlayerAcquisitionData {
  id: string;
  playerId: string;
  playerName: string;
  position: string;
  teamId: string;
  seasonYear: number;
  acquisitionType: AcquisitionType;
  draftRound: number | null;
  acquisitionDate: Date;
}

export interface KeeperCostResult {
  playerId: string;
  playerName: string;
  position: string;
  acquisitionType: AcquisitionType;
  originalRound: number | null;
  yearsKept: number;
  keeperCost: number | null; // null means ineligible
  isEligible: boolean;
  acquisitionYear: number;
  acquisitionDisplay: string; // "Draft Rd 6", "Free Agent", "Trade"
}

export interface RosterWithKeepers {
  teamId: string;
  teamName: string;
  seasonYear: number;
  managerId: string | null;
  managerName: string | null;
  players: KeeperCostResult[];
}
