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
 * KEY CBS BEHAVIOR: When you KEEP a player, CBS creates a NEW "DRAFT" record
 * each year at their keeper cost. So a kept player has MULTIPLE DRAFT records
 * on the same slot across seasons.
 *
 * COMPLETE RULES:
 * 1. KEEPER (same slot, multiple seasons): Find EARLIEST acquisition on this slot.
 *    That's when the keeper clock started.
 * 2. FRESH DRAFT (same slot, first appearance): Only ONE acquisition on this slot
 *    in current season. Keeper clock starts now.
 * 3. TRADE: Trades preserve history. Follow chain back to original DRAFT
 *    (could be on different slot). Original drafter's year/round is keeper base.
 * 4. FA (same season as a draft): If player was DRAFTED by someone else THE SAME
 *    SEASON (then dropped), inherit that draft round.
 * 5. TRUE FA: If player was never drafted that season by anyone, use Round 15.
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

  // Step 2: Get the team's SLOT ID
  const slotId = currentAcquisition.team.slotId;

  // Step 3: Find ALL acquisitions for this player on this SLOT (any season)
  // This catches kept players who have DRAFT records across multiple seasons
  const allSlotAcquisitions = await db.playerAcquisition.findMany({
    where: {
      playerId,
      team: {
        slotId: slotId,
      },
    },
    include: {
      player: true,
      team: true,
    },
    orderBy: {
      seasonYear: "asc", // Earliest first
    },
  });

  // Step 4: If multiple acquisitions exist on this slot, return the EARLIEST
  // This handles kept players - the keeper clock started with the first acquisition
  if (allSlotAcquisitions.length > 1) {
    return allSlotAcquisitions[0]; // Earliest acquisition on this slot
  }

  // Step 5: Only ONE acquisition on this slot (current one)
  // Now determine if it's fresh draft, trade, or FA

  // 5a: If DRAFT, it's a fresh draft - return this acquisition
  if (currentAcquisition.acquisitionType === "DRAFT") {
    return currentAcquisition;
  }

  // 5b: If TRADE, follow the trade chain back to original DRAFT
  if (currentAcquisition.acquisitionType === "TRADE") {
    const originalDraft = await findOriginalDraftForTrade(playerId);
    if (originalDraft) {
      return originalDraft;
    }
    // No draft found - treat as FA
    return currentAcquisition;
  }

  // 5c: If FA, check if player was DRAFTED same season by ANY team
  if (currentAcquisition.acquisitionType === "FA") {
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
      // Player was drafted this season by another team, then dropped
      // Inherit that draft round
      return sameSeasonDraft;
    }

    // No draft this season - true FA, return the FA acquisition (will use Round 15)
    return currentAcquisition;
  }

  // Fallback (should never reach here)
  return currentAcquisition;
}

/**
 * Find the original DRAFT acquisition for a traded player.
 * Trades preserve keeper history - look for the earliest DRAFT across all teams.
 *
 * @param playerId - The player's ID
 */
async function findOriginalDraftForTrade(playerId: string) {
  // For trades, find the EARLIEST DRAFT acquisition across ALL teams
  // This is the original draft that started the keeper clock
  const originalDraft = await db.playerAcquisition.findFirst({
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

  return originalDraft;
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
