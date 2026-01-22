/**
 * Draft Order Service
 * Manages draft order using the DraftOrder table instead of Team.draftPosition.
 * Supports auto-creation for new seasons by copying from previous season.
 */

import { db } from "@/lib/db";
import type { DraftOrder } from "@prisma/client";
import { getTeamNameForSlot } from "./index";

export interface DraftOrderWithName extends DraftOrder {
  teamName: string;
}

/**
 * Get draft order for a season.
 * Returns empty array if no draft order exists for the season.
 */
export async function getDraftOrderForSeason(
  seasonYear: number
): Promise<DraftOrder[]> {
  return db.draftOrder.findMany({
    where: { seasonYear },
    orderBy: { position: "asc" },
  });
}

/**
 * Get draft order with team names for a season.
 */
export async function getDraftOrderWithNames(
  seasonYear: number
): Promise<DraftOrderWithName[]> {
  const orders = await getDraftOrderForSeason(seasonYear);

  const result: DraftOrderWithName[] = [];
  for (const order of orders) {
    const teamName = await getTeamNameForSlot(order.slotId, seasonYear);
    result.push({ ...order, teamName });
  }

  return result;
}

/**
 * Get or create draft order for a season.
 * If no draft order exists, copies from the previous season.
 * If no previous season exists, creates default order (slot 1 = position 1, etc.)
 */
export async function getOrCreateDraftOrder(
  seasonYear: number
): Promise<DraftOrder[]> {
  // Check if draft order already exists
  const existing = await getDraftOrderForSeason(seasonYear);
  if (existing.length > 0) {
    return existing;
  }

  // Try to copy from previous season
  const previousYear = seasonYear - 1;
  const previousOrder = await getDraftOrderForSeason(previousYear);

  if (previousOrder.length > 0) {
    // Copy from previous season
    const created = await Promise.all(
      previousOrder.map((order) =>
        db.draftOrder.create({
          data: {
            slotId: order.slotId,
            seasonYear,
            position: order.position,
          },
        })
      )
    );
    return created.sort((a, b) => a.position - b.position);
  }

  // No previous season - create default order
  const slots = await db.teamSlot.findMany({
    orderBy: { id: "asc" },
  });

  const created = await Promise.all(
    slots.map((slot) =>
      db.draftOrder.create({
        data: {
          slotId: slot.id,
          seasonYear,
          position: slot.id, // Default: slot 1 = position 1
        },
      })
    )
  );

  return created.sort((a, b) => a.position - b.position);
}

/**
 * Set draft position for a slot in a season.
 * Creates the draft order entry if it doesn't exist.
 */
export async function setDraftPosition(
  slotId: number,
  seasonYear: number,
  position: number
): Promise<DraftOrder> {
  return db.draftOrder.upsert({
    where: {
      slotId_seasonYear: { slotId, seasonYear },
    },
    create: {
      slotId,
      seasonYear,
      position,
    },
    update: {
      position,
    },
  });
}

/**
 * Update entire draft order for a season.
 * Expects an array of { slotId, position } entries.
 */
export async function updateDraftOrder(
  seasonYear: number,
  entries: Array<{ slotId: number; position: number }>
): Promise<DraftOrder[]> {
  // Use a transaction to ensure all updates succeed or none do
  return db.$transaction(
    entries.map((entry) =>
      db.draftOrder.upsert({
        where: {
          slotId_seasonYear: { slotId: entry.slotId, seasonYear },
        },
        create: {
          slotId: entry.slotId,
          seasonYear,
          position: entry.position,
        },
        update: {
          position: entry.position,
        },
      })
    )
  );
}

/**
 * Resolve slot ID from draft position.
 * Useful for importers that only know draft position.
 */
export async function resolveSlotFromDraftPosition(
  seasonYear: number,
  position: number
): Promise<number | null> {
  const order = await db.draftOrder.findFirst({
    where: { seasonYear, position },
  });
  return order?.slotId ?? null;
}

/**
 * Get all seasons that have draft orders.
 */
export async function getSeasonsWithDraftOrder(): Promise<number[]> {
  const result = await db.draftOrder.groupBy({
    by: ["seasonYear"],
    orderBy: { seasonYear: "desc" },
  });
  return result.map((r) => r.seasonYear);
}

/**
 * Check if draft order exists for a season.
 */
export async function hasDraftOrder(seasonYear: number): Promise<boolean> {
  const count = await db.draftOrder.count({
    where: { seasonYear },
  });
  return count > 0;
}
