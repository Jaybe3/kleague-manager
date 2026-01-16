import { db } from "@/lib/db";
import type { ParsedDraftPick, ParsedPlayer } from "./types";
import { getTeamPermanentId, isValidTeamName } from "./team-mapper";

// ============= Player Operations =============

/**
 * Find or create a player by PlayerMatch key
 */
export async function findOrCreatePlayer(data: ParsedPlayer): Promise<string> {
  const existing = await db.player.findUnique({
    where: { playerMatchKey: data.playerMatchKey },
  });

  if (existing) {
    return existing.id;
  }

  const created = await db.player.create({
    data: {
      playerMatchKey: data.playerMatchKey,
      firstName: data.firstName,
      lastName: data.lastName,
      position: data.position,
    },
  });

  return created.id;
}

/**
 * Update player info if needed (in case name/position changed)
 */
export async function updatePlayerIfNeeded(
  playerId: string,
  data: ParsedPlayer
): Promise<void> {
  await db.player.update({
    where: { id: playerId },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      position: data.position,
    },
  });
}

// ============= Team Operations =============

/**
 * Find or create a team for a season
 */
export async function findOrCreateTeam(
  teamName: string,
  seasonYear: number,
  draftPosition: number
): Promise<string> {
  const permanentId = getTeamPermanentId(teamName);

  const existing = await db.team.findUnique({
    where: {
      permanentId_seasonYear: {
        permanentId,
        seasonYear,
      },
    },
  });

  if (existing) {
    return existing.id;
  }

  const created = await db.team.create({
    data: {
      permanentId,
      teamName: teamName.trim(),
      seasonYear,
      draftPosition,
    },
  });

  return created.id;
}

/**
 * Get team ID by permanent ID and season
 */
export async function getTeamId(
  teamName: string,
  seasonYear: number
): Promise<string | null> {
  const permanentId = getTeamPermanentId(teamName);

  const team = await db.team.findUnique({
    where: {
      permanentId_seasonYear: {
        permanentId,
        seasonYear,
      },
    },
  });

  return team?.id ?? null;
}

// ============= Season Operations =============

/**
 * Find or create a season
 */
export async function findOrCreateSeason(year: number): Promise<string> {
  const existing = await db.season.findUnique({
    where: { year },
  });

  if (existing) {
    return existing.id;
  }

  // Default dates - commissioner can update later
  const draftDate = new Date(year, 7, 25); // August 25
  const keeperDeadline = new Date(year, 7, 20); // August 20

  const created = await db.season.create({
    data: {
      year,
      draftDate,
      keeperDeadline,
      totalRounds: 28,
      isActive: false,
    },
  });

  return created.id;
}

// ============= Draft Import =============

export interface DraftImportResult {
  playersCreated: number;
  playersUpdated: number;
  acquisitionsCreated: number;
  teamsCreated: number;
  errors: string[];
  warnings: string[];
}

/**
 * Import draft picks into the database
 */
export async function importDraftPicks(
  picks: ParsedDraftPick[]
): Promise<DraftImportResult> {
  const result: DraftImportResult = {
    playersCreated: 0,
    playersUpdated: 0,
    acquisitionsCreated: 0,
    teamsCreated: 0,
    errors: [],
    warnings: [],
  };

  // Track created entities to avoid duplicates
  const createdPlayers = new Set<string>();
  const createdTeams = new Set<string>();

  // Group picks by team to determine draft positions
  const teamFirstPicks = new Map<string, number>();
  for (const pick of picks) {
    const teamKey = pick.teamName.trim().toLowerCase();
    if (!teamFirstPicks.has(teamKey)) {
      teamFirstPicks.set(teamKey, pick.draftPick);
    }
  }

  for (const pick of picks) {
    try {
      // Validate team name
      if (!isValidTeamName(pick.teamName)) {
        result.errors.push(`Unknown team: "${pick.teamName}" for player ${pick.player.firstName} ${pick.player.lastName}`);
        continue;
      }

      // Find or create player
      const existingPlayer = await db.player.findUnique({
        where: { playerMatchKey: pick.player.playerMatchKey },
      });

      let playerId: string;
      if (existingPlayer) {
        playerId = existingPlayer.id;
        if (!createdPlayers.has(pick.player.playerMatchKey)) {
          result.playersUpdated++;
        }
      } else {
        playerId = await findOrCreatePlayer(pick.player);
        result.playersCreated++;
      }
      createdPlayers.add(pick.player.playerMatchKey);

      // Find or create team
      const teamKey = `${pick.teamName.trim().toLowerCase()}-${pick.seasonYear}`;
      const draftPosition = teamFirstPicks.get(pick.teamName.trim().toLowerCase()) || 1;

      if (!createdTeams.has(teamKey)) {
        const existingTeam = await getTeamId(pick.teamName, pick.seasonYear);
        if (!existingTeam) {
          await findOrCreateTeam(pick.teamName, pick.seasonYear, draftPosition);
          result.teamsCreated++;
        }
        createdTeams.add(teamKey);
      }

      const teamId = await getTeamId(pick.teamName, pick.seasonYear);
      if (!teamId) {
        result.errors.push(`Could not find/create team: "${pick.teamName}" for season ${pick.seasonYear}`);
        continue;
      }

      // Check for existing acquisition (avoid duplicates)
      const existingAcquisition = await db.playerAcquisition.findFirst({
        where: {
          playerId,
          teamId,
          seasonYear: pick.seasonYear,
          acquisitionType: "DRAFT",
        },
      });

      if (existingAcquisition) {
        result.warnings.push(`Duplicate draft pick skipped: ${pick.player.firstName} ${pick.player.lastName} (${pick.seasonYear})`);
        continue;
      }

      // Create acquisition record
      await db.playerAcquisition.create({
        data: {
          playerId,
          teamId,
          seasonYear: pick.seasonYear,
          acquisitionType: "DRAFT",
          draftRound: pick.draftRound,
          draftPick: pick.draftPick,
          acquisitionDate: new Date(pick.seasonYear, 7, 25), // Draft date placeholder
        },
      });

      result.acquisitionsCreated++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`Error importing ${pick.player.firstName} ${pick.player.lastName}: ${message}`);
    }
  }

  return result;
}

/**
 * Create all teams for a season based on draft picks
 */
export async function createTeamsFromDraftPicks(
  picks: ParsedDraftPick[],
  seasonYear: number
): Promise<number> {
  const teams = new Map<string, number>();

  // Find first pick for each team (determines draft position)
  for (const pick of picks) {
    if (pick.seasonYear !== seasonYear) continue;

    const teamKey = pick.teamName.trim().toLowerCase();
    if (!teams.has(teamKey)) {
      teams.set(teamKey, pick.draftPick);
    }
  }

  let created = 0;
  for (const [teamName, draftPosition] of teams) {
    try {
      const existing = await getTeamId(teamName, seasonYear);
      if (!existing) {
        await findOrCreateTeam(teamName, seasonYear, draftPosition);
        created++;
      }
    } catch (error) {
      // Team name not in mapping - skip
      console.error(`Could not create team: ${teamName}`, error);
    }
  }

  return created;
}
