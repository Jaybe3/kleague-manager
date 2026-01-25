/**
 * Team Initializer
 * Creates Team records for a season using TeamSlot, TeamAlias, and DraftOrder data.
 * Enables keeper selection and other team-dependent features before draft import.
 */

import { db } from "@/lib/db";
import { getTeamNameForSlot } from "./index";
import { getOrCreateDraftOrder } from "./draft-order-service";
import type { Team } from "@prisma/client";

export interface InitializeResult {
  teamsCreated: number;
  teamsExisted: number;
  teams: Team[];
}

/**
 * Initialize Team records for a season from slot data.
 *
 * For each TeamSlot (1-10):
 *   - teamName: from TeamAlias (current name for that season)
 *   - draftPosition: from DraftOrder table (auto-created if needed)
 *   - managerId: from TeamSlot.managerId (current slot owner)
 *   - slotId: the slot ID
 *
 * Idempotent: Skips slots that already have Team records for this season.
 */
export async function initializeTeamsForSeason(
  seasonYear: number
): Promise<InitializeResult> {
  const result: InitializeResult = {
    teamsCreated: 0,
    teamsExisted: 0,
    teams: [],
  };

  // Get all slots
  const slots = await db.teamSlot.findMany({
    orderBy: { id: "asc" },
  });

  // Ensure draft order exists (creates from previous season if needed)
  const draftOrders = await getOrCreateDraftOrder(seasonYear);
  const slotToPosition = new Map<number, number>();
  for (const order of draftOrders) {
    slotToPosition.set(order.slotId, order.position);
  }

  for (const slot of slots) {
    // Check if Team already exists for this slot+season
    const existing = await db.team.findUnique({
      where: {
        slotId_seasonYear: { slotId: slot.id, seasonYear },
      },
    });

    if (existing) {
      result.teamsExisted++;
      result.teams.push(existing);
      continue;
    }

    // Get current team name for this slot
    const teamName = await getTeamNameForSlot(slot.id, seasonYear);

    // Get draft position (default to slotId if not in DraftOrder)
    const draftPosition = slotToPosition.get(slot.id) ?? slot.id;

    // Create Team record
    const team = await db.team.create({
      data: {
        slotId: slot.id,
        teamName,
        seasonYear,
        draftPosition,
        managerId: slot.managerId,
      },
    });

    result.teamsCreated++;
    result.teams.push(team);
  }

  return result;
}

/**
 * Ensure a Team exists for a specific slot and season.
 * Returns the existing or newly created Team.
 */
export async function ensureTeamForSlot(
  slotId: number,
  seasonYear: number
): Promise<Team> {
  const existing = await db.team.findUnique({
    where: {
      slotId_seasonYear: { slotId, seasonYear },
    },
  });

  if (existing) {
    return existing;
  }

  // Initialize all teams for this season (keeps data consistent)
  const initResult = await initializeTeamsForSeason(seasonYear);

  const team = initResult.teams.find((t) => t.slotId === slotId);
  if (!team) {
    throw new Error(
      `Failed to create team for slot ${slotId}, season ${seasonYear}`
    );
  }

  return team;
}
