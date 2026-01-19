// Roster service - fetches team roster with keeper cost calculations

import { db } from "@/lib/db";
import { calculateRosterKeeperCosts } from "./keeper-calculator";
import { AcquisitionType, PlayerAcquisitionData, RosterWithKeepers } from "./types";

/**
 * Get a team's current roster with keeper costs calculated
 */
export async function getTeamRosterWithKeepers(
  teamId: string,
  targetSeasonYear: number
): Promise<RosterWithKeepers | null> {
  // Fetch team info
  const team = await db.team.findUnique({
    where: { id: teamId },
    include: {
      manager: {
        select: { id: true, displayName: true },
      },
    },
  });

  if (!team) {
    return null;
  }

  // Fetch all acquisitions for this team in the current season (excluding dropped players)
  const acquisitions = await db.playerAcquisition.findMany({
    where: {
      teamId: teamId,
      seasonYear: targetSeasonYear,
      droppedDate: null, // Only players still on roster
    },
    include: {
      player: true,
    },
    orderBy: [
      { acquisitionType: "asc" },
      { draftRound: "asc" },
    ],
  });

  // Convert to PlayerAcquisitionData format
  const acquisitionData: PlayerAcquisitionData[] = acquisitions.map(acq => ({
    id: acq.id,
    playerId: acq.playerId,
    playerName: `${acq.player.firstName} ${acq.player.lastName}`,
    position: acq.player.position,
    teamId: acq.teamId,
    seasonYear: acq.seasonYear,
    acquisitionType: acq.acquisitionType as AcquisitionType,
    draftRound: acq.draftRound,
    acquisitionDate: acq.acquisitionDate,
  }));

  // Get keeper history (how many times each player has been kept)
  const keeperHistory = await getKeeperHistory(teamId, targetSeasonYear);

  // Calculate keeper costs for next season
  const nextSeasonYear = targetSeasonYear + 1;
  const playersWithCosts = calculateRosterKeeperCosts(
    acquisitionData,
    nextSeasonYear,
    keeperHistory
  );

  return {
    teamId: team.id,
    teamName: team.teamName,
    seasonYear: targetSeasonYear,
    managerId: team.managerId,
    managerName: team.manager?.displayName ?? null,
    players: playersWithCosts,
  };
}

/**
 * Get keeper history for a team's players
 * Returns a map of playerId -> number of years kept
 */
async function getKeeperHistory(
  teamId: string,
  beforeSeasonYear: number
): Promise<Map<string, number>> {
  const keeperSelections = await db.keeperSelection.findMany({
    where: {
      teamId: teamId,
      seasonYear: { lt: beforeSeasonYear },
      isFinalized: true,
    },
    select: {
      playerId: true,
      yearsKept: true,
    },
  });

  const history = new Map<string, number>();
  for (const selection of keeperSelections) {
    const currentCount = history.get(selection.playerId) ?? 0;
    history.set(selection.playerId, Math.max(currentCount, selection.yearsKept));
  }

  return history;
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
