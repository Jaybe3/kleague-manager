import { db } from "@/lib/db";
import { calculateKeeperCost } from "./calculator";
import type { KeeperCalculationInput, KeeperCalculationResult, PlayerKeeperInfo } from "./types";

/**
 * Result of getting a player's keeper info with calculated cost
 */
export interface PlayerKeeperCostResult {
  player: {
    id: string;
    firstName: string;
    lastName: string;
    position: string;
    playerMatchKey: string;
  };
  acquisition: {
    type: "DRAFT" | "FA";
    year: number;
    draftRound: number | null;
    draftPick: number | null;
  };
  calculation: KeeperCalculationResult;
}

/**
 * Team roster with keeper costs for each player
 */
export interface TeamRosterWithKeeperCosts {
  team: {
    id: string;
    teamName: string;
    slotId: number;
    seasonYear: number;
  };
  players: PlayerKeeperCostResult[];
  targetYear: number;
}

/**
 * Find the keeper base acquisition for cost calculation.
 *
 * KEY INSIGHT: When a player re-enters the draft pool (wasn't kept, wasn't traded),
 * they get a CLEAN SLATE. The new drafter's draft year/round becomes the keeper base.
 *
 * RULES:
 * 1. You DRAFTED the player → Use YOUR draft year/round as the keeper base
 * 2. You TRADED for the player → Follow trade chain back to original DRAFT (trades preserve history)
 * 3. You picked up player as FA in SAME season they were drafted → Inherit that draft round
 * 4. You picked up player as FA who was never drafted that season → True FA, use Round 15
 *
 * @param playerId - The player's ID
 * @param teamId - The team's ID (to find the current active acquisition)
 */
async function findKeeperBaseAcquisition(playerId: string, teamId: string) {
  // Step 1: Get the player's ACTIVE acquisition on this team (droppedDate = null)
  const currentAcquisition = await db.playerAcquisition.findFirst({
    where: {
      playerId,
      teamId,
      droppedDate: null,
    },
    orderBy: {
      acquisitionDate: "desc",
    },
    include: {
      player: true,
      team: true,
    },
  });

  if (!currentAcquisition) {
    return null; // Player not active on this team
  }

  // Step 2: If current acquisition is DRAFT, return it (your draft is the keeper base)
  if (currentAcquisition.acquisitionType === "DRAFT") {
    return currentAcquisition;
  }

  // Step 3: If current acquisition is TRADE, follow the trade chain back
  if (currentAcquisition.acquisitionType === "TRADE") {
    return await followTradeChainToOrigin(playerId, currentAcquisition.seasonYear);
  }

  // Step 4: If current acquisition is FA, check if player was drafted SAME season
  if (currentAcquisition.acquisitionType === "FA") {
    // Look for a DRAFT in the SAME season (by any team)
    const sameSeasonDraft = await db.playerAcquisition.findFirst({
      where: {
        playerId,
        acquisitionType: "DRAFT",
        seasonYear: currentAcquisition.seasonYear,
      },
      include: {
        player: true,
      },
    });

    if (sameSeasonDraft) {
      // Player was drafted this season, then dropped - inherit that draft round
      return sameSeasonDraft;
    }

    // No draft this season - true FA, return the FA acquisition (will use Round 15)
    return currentAcquisition;
  }

  // Fallback (should never reach here)
  return currentAcquisition;
}

/**
 * Follow the trade chain back to find the original DRAFT or FA that started the keeper clock.
 * Trades preserve keeper history - the player keeps their original draft cost.
 *
 * @param playerId - The player's ID
 * @param seasonYear - The season to search within
 */
async function followTradeChainToOrigin(playerId: string, seasonYear: number) {
  // For trades, we need to find the original DRAFT in the trade chain
  // The trade chain is within the same season - keeper cost follows the original draft

  // First, check if player was drafted THIS season (by any team)
  const sameSeasonDraft = await db.playerAcquisition.findFirst({
    where: {
      playerId,
      acquisitionType: "DRAFT",
      seasonYear,
    },
    include: {
      player: true,
    },
  });

  if (sameSeasonDraft) {
    return sameSeasonDraft;
  }

  // No draft this season - check for FA this season (player entered as FA, then traded)
  const sameSeasonFA = await db.playerAcquisition.findFirst({
    where: {
      playerId,
      acquisitionType: "FA",
      seasonYear,
    },
    orderBy: {
      acquisitionDate: "asc",
    },
    include: {
      player: true,
    },
  });

  if (sameSeasonFA) {
    // Player was FA this season, then traded - check if they were drafted in a PREVIOUS season
    // and kept/traded through (continuous ownership chain)
    const previousSeasonDraft = await db.playerAcquisition.findFirst({
      where: {
        playerId,
        acquisitionType: "DRAFT",
        seasonYear: { lt: seasonYear },
      },
      orderBy: {
        seasonYear: "desc", // Get most recent draft before this season
      },
      include: {
        player: true,
      },
    });

    // Only inherit previous draft if there's a continuous chain (keeper or trade from previous season)
    // For now, if traded and has previous draft, use that draft
    // This handles kept players who were then traded mid-season
    if (previousSeasonDraft) {
      return previousSeasonDraft;
    }

    return sameSeasonFA;
  }

  // No acquisition found this season - look for previous season draft
  // (player was kept from previous year and traded)
  const previousDraft = await db.playerAcquisition.findFirst({
    where: {
      playerId,
      acquisitionType: "DRAFT",
    },
    orderBy: {
      seasonYear: "desc",
    },
    include: {
      player: true,
    },
  });

  return previousDraft;
}

/**
 * Get keeper cost calculation for a specific player on a team
 *
 * @param playerId - The player's ID
 * @param teamId - The team's ID (to verify player is on this team)
 * @param targetYear - The year to calculate keeper cost for
 */
export async function getPlayerKeeperCost(
  playerId: string,
  teamId: string,
  targetYear: number
): Promise<PlayerKeeperCostResult | null> {
  // Find the keeper base acquisition (handles DRAFT, TRADE, FA correctly)
  const keeperBaseAcquisition = await findKeeperBaseAcquisition(playerId, teamId);

  if (!keeperBaseAcquisition) {
    return null; // Player not active on this team or no valid acquisition found
  }

  // Determine acquisition type for calculation (TRADE uses underlying DRAFT/FA)
  const acquisitionType = keeperBaseAcquisition.acquisitionType === "TRADE"
    ? "FA" // If trade chain couldn't find draft, treat as FA
    : keeperBaseAcquisition.acquisitionType as "DRAFT" | "FA";

  // Build calculation input
  const input: KeeperCalculationInput = {
    acquisitionType,
    originalDraftRound: keeperBaseAcquisition.draftRound,
    acquisitionYear: keeperBaseAcquisition.seasonYear,
    targetYear,
  };

  // Calculate keeper cost
  const calculation = calculateKeeperCost(input);

  return {
    player: {
      id: keeperBaseAcquisition.player.id,
      firstName: keeperBaseAcquisition.player.firstName,
      lastName: keeperBaseAcquisition.player.lastName,
      position: keeperBaseAcquisition.player.position,
      playerMatchKey: keeperBaseAcquisition.player.playerMatchKey,
    },
    acquisition: {
      type: acquisitionType,
      year: keeperBaseAcquisition.seasonYear,
      draftRound: keeperBaseAcquisition.draftRound,
      draftPick: keeperBaseAcquisition.draftPick,
    },
    calculation,
  };
}

/**
 * Get all players on a team's roster with their keeper costs
 * 
 * @param teamId - The team's ID
 * @param targetYear - The year to calculate keeper costs for
 */
export async function getTeamRosterWithKeeperCosts(
  teamId: string,
  targetYear: number
): Promise<TeamRosterWithKeeperCosts | null> {
  // Get team info
  const team = await db.team.findUnique({
    where: { id: teamId },
  });

  if (!team) {
    return null;
  }

  // Get all players currently on this team (not dropped)
  // Only include acquisitions where droppedDate is null (still on roster)
  const acquisitions = await db.playerAcquisition.findMany({
    where: {
      teamId,
      droppedDate: null,
    },
    include: {
      player: true,
    },
    orderBy: {
      acquisitionDate: "desc",
    },
  });

  // Deduplicate to get unique players (most recent acquisition wins)
  const playerMap = new Map<string, typeof acquisitions[0]>();
  for (const acq of acquisitions) {
    if (!playerMap.has(acq.playerId)) {
      playerMap.set(acq.playerId, acq);
    }
  }

  // Calculate keeper costs for each player
  const players: PlayerKeeperCostResult[] = [];

  for (const [playerId] of playerMap) {
    const result = await getPlayerKeeperCost(playerId, teamId, targetYear);
    if (result) {
      players.push(result);
    }
  }

  // Sort by keeper round (eligible first, then by round ascending)
  players.sort((a, b) => {
    // Eligible players first
    if (a.calculation.isEligible && !b.calculation.isEligible) return -1;
    if (!a.calculation.isEligible && b.calculation.isEligible) return 1;

    // Both eligible: sort by keeper round (lower round = earlier pick = more valuable)
    if (a.calculation.isEligible && b.calculation.isEligible) {
      return (a.calculation.keeperRound ?? 0) - (b.calculation.keeperRound ?? 0);
    }

    // Both ineligible: sort by name
    return a.player.lastName.localeCompare(b.player.lastName);
  });

  return {
    team: {
      id: team.id,
      teamName: team.teamName,
      slotId: team.slotId,
      seasonYear: team.seasonYear,
    },
    players,
    targetYear,
  };
}

/**
 * Get keeper costs for all teams in a season
 * 
 * @param seasonYear - The season year (for finding teams)
 * @param targetYear - The year to calculate keeper costs for
 */
export async function getAllTeamsKeeperCosts(
  seasonYear: number,
  targetYear: number
): Promise<TeamRosterWithKeeperCosts[]> {
  const teams = await db.team.findMany({
    where: { seasonYear },
    orderBy: { slotId: "asc" },
  });

  const results: TeamRosterWithKeeperCosts[] = [];

  for (const team of teams) {
    const roster = await getTeamRosterWithKeeperCosts(team.id, targetYear);
    if (roster) {
      results.push(roster);
    }
  }

  return results;
}

/**
 * Get players with round conflicts (multiple players at same keeper round)
 * 
 * @param teamId - The team's ID
 * @param targetYear - The year to check conflicts for
 */
export async function getKeeperRoundConflicts(
  teamId: string,
  targetYear: number
): Promise<Map<number, PlayerKeeperCostResult[]>> {
  const roster = await getTeamRosterWithKeeperCosts(teamId, targetYear);

  if (!roster) {
    return new Map();
  }

  // Group eligible players by keeper round
  const roundMap = new Map<number, PlayerKeeperCostResult[]>();

  for (const player of roster.players) {
    if (player.calculation.isEligible && player.calculation.keeperRound !== null) {
      const round = player.calculation.keeperRound;
      const existing = roundMap.get(round) ?? [];
      existing.push(player);
      roundMap.set(round, existing);
    }
  }

  // Filter to only rounds with conflicts (2+ players)
  const conflicts = new Map<number, PlayerKeeperCostResult[]>();
  for (const [round, players] of roundMap) {
    if (players.length > 1) {
      conflicts.set(round, players);
    }
  }

  return conflicts;
}

/**
 * Get the current/active season year
 */
export async function getCurrentSeasonYear(): Promise<number> {
  const activeSeason = await db.season.findFirst({
    where: { isActive: true },
    select: { year: true },
  });

  if (activeSeason) {
    return activeSeason.year;
  }

  // Fallback: get the most recent season
  const latestSeason = await db.season.findFirst({
    orderBy: { year: "desc" },
    select: { year: true },
  });

  return latestSeason?.year ?? new Date().getFullYear();
}

/**
 * Get team by manager's user ID
 * Falls back to most recent team if no team exists for the requested season
 */
export async function getTeamByManagerId(
  managerId: string,
  seasonYear: number
): Promise<{ id: string; teamName: string; slotId: number } | null> {
  // First try exact match for requested season
  let team = await db.team.findFirst({
    where: {
      managerId: managerId,
      seasonYear: seasonYear,
    },
    select: {
      id: true,
      teamName: true,
      slotId: true,
    },
  });

  // If no team for requested season, fall back to most recent team
  if (!team) {
    team = await db.team.findFirst({
      where: { managerId: managerId },
      orderBy: { seasonYear: "desc" },
      select: {
        id: true,
        teamName: true,
        slotId: true,
      },
    });
  }

  return team;
}
