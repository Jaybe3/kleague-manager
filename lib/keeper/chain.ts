/**
 * Keeper chain resolution.
 *
 * A player's keeper cost is derived from the acquisition that *started* his
 * current run on a team - his "keeper base". Finding it means walking backward
 * through his history and stopping at the first break.
 *
 * A run continues only while the player shows up as a DRAFT on the same slot
 * in each consecutive season, which is how a kept player is recorded. Any gap,
 * any season he appears as an FA, or any season on a different slot ends the
 * run: he was let go and re-acquired, so the clock restarted.
 *
 * Trades are the subtle case. A traded player keeps the clock he was already
 * on, so we follow the trade back to the acquisition it closed and resolve the
 * chain on *that* team - not by reaching for his oldest draft ever, which
 * would silently reach across breaks and across other managers' teams.
 *
 * These functions are pure so the rules can be tested without a database; the
 * callers supply the acquisitions.
 */

export const TRADE = "TRADE";
export const DRAFT = "DRAFT";
export const FA = "FA";

/** The fields chain resolution needs from an acquisition. */
export interface ChainAcquisition {
  seasonYear: number;
  /** Slot the acquisition belongs to (the franchise, stable across renames) */
  slotId: number | null;
  acquisitionType: string;
  acquisitionDate: Date;
  droppedDate: Date | null;
  /** For a TRADE, the slot the player came from */
  tradedFromSlotId: number | null;
}

/** Guard against a cycle in trade records sending us round forever. */
const MAX_TRADE_HOPS = 20;

/**
 * Walk backward from `fromYear` on one slot and return the season the current
 * run began. Stops at the first season without a DRAFT for that slot.
 */
export function findChainStartYear(
  acquisitions: ChainAcquisition[],
  slotId: number,
  fromYear: number
): number {
  const draftYears = new Set(
    acquisitions
      .filter((a) => a.slotId === slotId && a.acquisitionType === DRAFT)
      .map((a) => a.seasonYear)
  );

  let start = fromYear;
  while (draftYears.has(start - 1)) {
    start -= 1;
  }
  return start;
}

/**
 * The acquisition a trade closed: the player's row on the team he came from,
 * dropped when the trade landed.
 *
 * Matched on the drop date rather than the season, because a trade and the
 * acquisition it ends share that instant, and a mid-season trade can sit in a
 * different season from the roster row it closes.
 */
export function findTradeSource<T extends ChainAcquisition>(
  acquisitions: T[],
  trade: ChainAcquisition
): T | null {
  if (trade.tradedFromSlotId == null) return null;

  const candidates = acquisitions.filter(
    (a) =>
      a.slotId === trade.tradedFromSlotId &&
      a.droppedDate != null &&
      a.droppedDate.getTime() <= trade.acquisitionDate.getTime()
  );

  if (candidates.length === 0) return null;

  // The one dropped closest to the trade is the row it closed
  return candidates.reduce((best, a) =>
    a.droppedDate!.getTime() > best.droppedDate!.getTime() ? a : best
  );
}

/**
 * Resolve the keeper base for a player currently held by trade.
 *
 * Follows the trade back to what it closed - through further trades if the
 * player changed hands more than once - then resolves the chain on the team
 * that actually drafted him. Returns null when the trail can't be followed,
 * leaving the caller to fall back.
 */
export function resolveTradeBase<T extends ChainAcquisition>(
  acquisitions: T[],
  trade: T
): T | null {
  let current: ChainAcquisition = trade;

  for (let hop = 0; hop < MAX_TRADE_HOPS; hop++) {
    const source = findTradeSource(acquisitions, current);
    if (!source) return null;

    // Another trade - keep following it back
    if (source.acquisitionType === TRADE) {
      current = source;
      continue;
    }

    // Drafted: the run may reach back further on that same slot
    if (source.acquisitionType === DRAFT && source.slotId != null) {
      const startYear = findChainStartYear(
        acquisitions,
        source.slotId,
        source.seasonYear
      );

      if (startYear === source.seasonYear) return source;

      const start = acquisitions.find(
        (a) =>
          a.slotId === source.slotId &&
          a.seasonYear === startYear &&
          a.acquisitionType === DRAFT
      );
      return start ?? source;
    }

    // Picked up as a free agent - that's where the clock started
    return source;
  }

  return null;
}
