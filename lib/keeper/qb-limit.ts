/**
 * A team may carry only three quarterbacks into a new season.
 *
 * The one valve is a commissioner-granted IR exemption: a QB on injured
 * reserve is still kept, still costs his draft round, and still competes for
 * a round like any other keeper - he simply doesn't count against the three.
 * Several exemptions can be active at once, so five QBs with two on IR is a
 * legal roster.
 */

export const MAX_QB_KEEPERS = 3;

export const QB_POSITION = "QB";

/** The shape this module needs from a keeper selection. */
export interface QbCountable {
  position: string;
  playerName: string;
  isIrExempt: boolean;
}

export function isQb(position: string): boolean {
  return position.toUpperCase() === QB_POSITION;
}

/** QBs that count against the limit - exempt ones are excluded. */
export function countingQbs<T extends QbCountable>(selections: T[]): T[] {
  return selections.filter((s) => isQb(s.position) && !s.isIrExempt);
}

/** QBs held under an IR exemption. */
export function exemptQbs<T extends QbCountable>(selections: T[]): T[] {
  return selections.filter((s) => isQb(s.position) && s.isIrExempt);
}

export interface QbLimitStatus {
  /** QBs counting against the limit */
  counted: number;
  /** QBs excused by an IR exemption */
  exempt: number;
  limit: number;
  /** True when the roster already holds its full allowance */
  atLimit: boolean;
  /** True when the roster holds more than allowed - needs resolving */
  overLimit: boolean;
}

export function getQbLimitStatus(selections: QbCountable[]): QbLimitStatus {
  const counted = countingQbs(selections).length;
  return {
    counted,
    exempt: exemptQbs(selections).length,
    limit: MAX_QB_KEEPERS,
    atLimit: counted >= MAX_QB_KEEPERS,
    overLimit: counted > MAX_QB_KEEPERS,
  };
}

/**
 * Message shown when a manager tries to keep one QB too many.
 * Names the QBs already held so they know what to drop.
 */
export function qbLimitReachedError(selections: QbCountable[]): string {
  const held = countingQbs(selections).map((s) => s.playerName);
  return (
    `You can only keep ${MAX_QB_KEEPERS} quarterbacks. ` +
    `You already have ${held.join(", ")}. ` +
    `Remove one, or ask the commissioner to mark an injured QB as IR-exempt.`
  );
}

/**
 * Message shown when a submit is blocked because the roster is over the limit.
 * Reachable when a commissioner lifts an exemption after the fact.
 */
export function qbLimitSubmitError(selections: QbCountable[]): string {
  const held = countingQbs(selections).map((s) => s.playerName);
  return (
    `Can't submit - you have ${held.length} quarterbacks and the limit is ${MAX_QB_KEEPERS}.\n` +
    `Counting against the limit: ${held.join(", ")}.\n` +
    `Remove one, or ask the commissioner to mark an injured QB as IR-exempt.`
  );
}
