/**
 * Slot helper functions for the slot-centric data model.
 * Slots (1-10) are permanent league positions that don't change.
 */

import { db } from "@/lib/db";
import type { TeamSlot } from "@prisma/client";

/**
 * Get the team name for a slot in a specific season.
 * Looks up the TeamAlias that was valid for that year.
 * Falls back to the current name if no exact match.
 */
export async function getTeamNameForSlot(
  slotId: number,
  seasonYear: number
): Promise<string> {
  // Find alias that was valid for this season
  const alias = await db.teamAlias.findFirst({
    where: {
      slotId,
      validFrom: { lte: seasonYear },
      OR: [
        { validTo: null }, // Current name
        { validTo: { gte: seasonYear } }, // Was valid through this season
      ],
    },
    orderBy: { validFrom: "desc" }, // Most recent matching alias
  });

  if (alias) {
    return alias.teamName;
  }

  // Fallback: Get any alias for this slot (shouldn't happen with good data)
  const fallback = await db.teamAlias.findFirst({
    where: { slotId },
    orderBy: { validFrom: "desc" },
  });

  return fallback?.teamName ?? `Slot ${slotId}`;
}

/**
 * Get all team names for all slots for a specific season.
 * Returns a map of slotId -> teamName.
 */
export async function getAllTeamNamesForSeason(
  seasonYear: number
): Promise<Map<number, string>> {
  const result = new Map<number, string>();

  for (let slotId = 1; slotId <= 10; slotId++) {
    const name = await getTeamNameForSlot(slotId, seasonYear);
    result.set(slotId, name);
  }

  return result;
}

/**
 * Get the slot for a manager by their user ID.
 * Returns the TeamSlot if the user is assigned to one, null otherwise.
 */
export async function getSlotForManager(
  managerId: string
): Promise<TeamSlot | null> {
  return db.teamSlot.findFirst({
    where: { managerId },
  });
}

/**
 * Get all slots with their current team names.
 * Useful for dropdowns and lists.
 */
export async function getAllSlotsWithNames(): Promise<
  Array<{ slotId: number; teamName: string; managerId: string | null }>
> {
  const slots = await db.teamSlot.findMany({
    orderBy: { id: "asc" },
  });

  const result = [];
  for (const slot of slots) {
    // Get current name (validTo is null)
    const alias = await db.teamAlias.findFirst({
      where: { slotId: slot.id, validTo: null },
    });

    result.push({
      slotId: slot.id,
      teamName: alias?.teamName ?? `Slot ${slot.id}`,
      managerId: slot.managerId,
    });
  }

  return result;
}

/**
 * Check if a user manages a specific slot.
 */
export async function userManagesSlot(
  userId: string,
  slotId: number
): Promise<boolean> {
  const slot = await db.teamSlot.findUnique({
    where: { id: slotId },
  });
  return slot?.managerId === userId;
}
