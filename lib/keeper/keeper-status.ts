/**
 * Where a rostered player landed in the keeper process, as one value.
 *
 * "Kept" and "not kept" don't cover the whole league mid-window: a team that
 * hasn't submitted yet hasn't said no, it hasn't said anything. That's PENDING,
 * and it disappears once the deadline passes.
 *
 * Visibility follows the same rule as the draft board: before the deadline only
 * submitted selections count league-wide, so a manager still experimenting
 * doesn't leak a half-edited roster. After the deadline everything on the
 * roster counts, submitted or not - the deadline is the lock, not the submit.
 */
export type KeeperStatus = "KEPT" | "NOT_KEPT" | "PENDING" | "INELIGIBLE";

export interface KeeperStatusInput {
  /** The player's keeper selection for the target year, if one counts yet. */
  selection: { keeperRound: number } | null;

  /** Whether the calculator says this player can be kept at all. */
  isEligible: boolean;

  /** Whether the owning team has submitted its keepers for the target year. */
  teamHasSubmitted: boolean;

  /** Whether the keeper deadline for the target year has passed. */
  deadlinePassed: boolean;
}

/**
 * Resolve a player's keeper status. Pure - the caller decides which selections
 * count (see `deadlinePassed` above) before handing one in.
 */
export function resolveKeeperStatus(input: KeeperStatusInput): KeeperStatus {
  // A selection settles it, eligibility included: a commissioner override can
  // put a player on a list the calculator would have called ineligible.
  if (input.selection) {
    return "KEPT";
  }

  // Never a choice to make - his cost fell past round 1.
  if (!input.isEligible) {
    return "INELIGIBLE";
  }

  // Passed over. Either the owner submitted without him, or the deadline hit
  // and whatever was on the roster is now final.
  if (input.teamHasSubmitted || input.deadlinePassed) {
    return "NOT_KEPT";
  }

  return "PENDING";
}

/**
 * Sort order for the status column: kept first, then the teams we're still
 * waiting on, then the settled noes.
 */
export const KEEPER_STATUS_RANK: Record<KeeperStatus, number> = {
  KEPT: 0,
  PENDING: 1,
  NOT_KEPT: 2,
  INELIGIBLE: 3,
};
