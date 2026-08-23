import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSlotForManager } from "@/lib/slots";
import { canModifySelections } from "./selection-service";

/**
 * Everything a keeper-mutation route needs, resolved and authorized in one
 * place: who's asking, which team they're editing, which season, and whether
 * the deadline lets them.
 */
export interface KeeperEditContext {
  /** Team row for the roster year (targetYear - 1) - keeper selections hang off this */
  rosterTeam: { id: string; slotId: number; teamName: string };
  /** Season we're selecting keepers FOR */
  targetYear: number;
  /** Slot being edited (may not be the caller's own, for a commissioner override) */
  slotId: number;
  /** True when a commissioner is editing past the deadline or on someone else's behalf */
  isOverride: boolean;
  /** True when the caller holds commissioner rights */
  isCommissioner: boolean;
}

export type KeeperEditContextResult =
  | { ok: true; context: KeeperEditContext }
  | { ok: false; error: string; status: number };

/**
 * Resolve and authorize a keeper edit.
 *
 * Managers edit their own slot, and only until the keeper deadline passes.
 *
 * Commissioners can pass a `slotId` to edit another team, and are not bound by
 * the deadline - that's the override valve for when a manager gets locked out,
 * a submission needs correcting, or two keepers end up sharing a round after
 * the deadline. Every override is flagged on the returned context so callers
 * can log or surface it.
 */
export async function resolveKeeperEditContext(
  requestedSlotId?: number | null
): Promise<KeeperEditContextResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Unauthorized", status: 401 };
  }

  const isCommissioner = session.user.isCommissioner ?? false;
  const ownSlot = await getSlotForManager(session.user.id);

  // Figure out which slot we're editing
  let slotId: number;
  let editingOtherTeam = false;

  if (requestedSlotId != null) {
    if (!Number.isInteger(requestedSlotId) || requestedSlotId < 1 || requestedSlotId > 10) {
      return { ok: false, error: "Invalid slotId - must be 1-10", status: 400 };
    }

    editingOtherTeam = ownSlot?.id !== requestedSlotId;

    if (editingOtherTeam && !isCommissioner) {
      return {
        ok: false,
        error: "Forbidden - Commissioner access required to edit another team",
        status: 403,
      };
    }

    slotId = requestedSlotId;
  } else {
    if (!ownSlot) {
      return { ok: false, error: "No team slot assigned to this user", status: 404 };
    }
    slotId = ownSlot.id;
  }

  const activeSeason = await db.season.findFirst({ where: { isActive: true } });
  if (!activeSeason) {
    return { ok: false, error: "No active season configured", status: 404 };
  }

  const targetYear = activeSeason.year;
  const rosterYear = targetYear - 1;

  const rosterTeam = await db.team.findFirst({
    where: { slotId, seasonYear: rosterYear },
    select: { id: true, slotId: true, teamName: true },
  });

  if (!rosterTeam) {
    return {
      ok: false,
      error: `No team found for slot ${slotId} in ${rosterYear} season - import draft data first`,
      status: 404,
    };
  }

  // Only the deadline locks selections - submitting does not. Commissioners
  // edit through the lock.
  const deadlineOpen = canModifySelections(activeSeason.keeperDeadline);

  if (!deadlineOpen && !isCommissioner) {
    return {
      ok: false,
      error: "The keeper deadline has passed - selections are locked",
      status: 403,
    };
  }

  return {
    ok: true,
    context: {
      rosterTeam,
      targetYear,
      slotId,
      isOverride: !deadlineOpen || editingOtherTeam,
      isCommissioner,
    },
  };
}
