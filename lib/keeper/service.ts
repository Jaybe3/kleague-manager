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
 * Find the original acquisition for keeper cost calculation.
 *
 * RULES:
 * 1. Search ALL teams for any DRAFT acquisition for this player
 * 2. If DRAFT found → use that (original draft determines cost)
 * 3. If NO DRAFT found → player is true undrafted FA, use earliest FA
 *
 * TODO: Handle reset scenario when multi-year data exists
 * - If player was dropped and NOT picked up rest of season, they reset
 * - They re-enter draft pool and original draft no longer applies
 * - Need to track season coverage, not just seasonYear field
 */
async function findOriginalAcquisition(playerId: string) {
  // First, look for ANY draft acquisition across ALL teams/seasons
  const draftAcquisition = await db.playerAcquisition.findFirst({
    where: {
      playerId,
      acquisitionType: "DRAFT",
    },
    orderBy: {
      seasonYear: "asc",
    },
    include: {
      player: true,
    },
  });

  if (draftAcquisition) {
    return draftAcquisition;
  }

  // No draft found - player is true undrafted FA
  const faAcquisition = await db.playerAcquisition.findFirst({
    where: {
      playerId,
      acquisitionType: "FA",
    },
    orderBy: {
      seasonYear: "asc",
    },
    include: {
      player: true,
    },
  });

  return faAcquisition;
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
  // Verify player has an acquisition on this team (current or via trade)
  const currentAcquisition = await db.playerAcquisition.findFirst({
    where: {
      playerId,
      teamId,
    },
    orderBy: {
      acquisitionDate: "desc",
    },
    include: {
      player: true,
    },
  });

  if (!currentAcquisition) {
    return null; // Player not on this team
  }

  // Find the original acquisition (DRAFT or FA)
  const originalAcquisition = await findOriginalAcquisition(playerId);

  if (!originalAcquisition) {
    return null; // No valid acquisition found
  }

  const acquisitionType = originalAcquisition.acquisitionType as "DRAFT" | "FA";

  // Build calculation input
  const input: KeeperCalculationInput = {
    acquisitionType,
    originalDraftRound: originalAcquisition.draftRound,
    acquisitionYear: originalAcquisition.seasonYear,
    targetYear,
  };

  // Calculate keeper cost
  const calculation = calculateKeeperCost(input);

  return {
    player: {
      id: originalAcquisition.player.id,
      firstName: originalAcquisition.player.firstName,
      lastName: originalAcquisition.player.lastName,
      position: originalAcquisition.player.position,
      playerMatchKey: originalAcquisition.player.playerMatchKey,
    },
    acquisition: {
      type: acquisitionType,
      year: originalAcquisition.seasonYear,
      draftRound: originalAcquisition.draftRound,
      draftPick: originalAcquisition.draftPick,
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
