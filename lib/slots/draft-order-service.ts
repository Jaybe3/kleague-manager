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
 * If no draft order exists, copies from the most recent season that has data.
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

  // Find the most recent season with draft order data (not just previousYear)
  const mostRecentSeason = await db.draftOrder.findFirst({
    where: {
      seasonYear: { lt: seasonYear },
    },
    orderBy: { seasonYear: "desc" },
    select: { seasonYear: true },
  });

  if (mostRecentSeason) {
    // Copy from the most recent season with data
    const sourceOrder = await getDraftOrderForSeason(mostRecentSeason.seasonYear);

    if (sourceOrder.length > 0) {
      const created = await Promise.all(
        sourceOrder.map((order) =>
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
  }

  // No previous season with data - create default order
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
 *
 * Uses a two-phase write because DraftOrder has a unique constraint on
 * (seasonYear, position): reordering existing rows would otherwise collide
 * mid-transaction (e.g. moving a slot into a position another slot still
 * holds). Phase 1 parks every affected row at a temporary negative position;
 * phase 2 assigns the final positions, which are now collision-free.
 */
export async function updateDraftOrder(
  seasonYear: number,
  entries: Array<{ slotId: number; position: number }>
): Promise<DraftOrder[]> {
  return db.$transaction(async (tx) => {
    // Phase 1: park existing rows at temporary negative positions to avoid
    // colliding with the (seasonYear, position) unique constraint.
    for (const entry of entries) {
      await tx.draftOrder.updateMany({
        where: { slotId: entry.slotId, seasonYear },
        data: { position: -entry.position },
      });
    }

    // Phase 2: set final positions (upsert covers slots with no existing row).
    const results: DraftOrder[] = [];
    for (const entry of entries) {
      results.push(
        await tx.draftOrder.upsert({
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
      );
    }

    return results;
  });
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
