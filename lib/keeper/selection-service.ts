import { db } from "@/lib/db";
import { getPlayerKeeperCost, getPlayerKeeperCostsBatch } from "./service";

// Re-export types for convenience
export type {
  KeeperSelectionInfo,
  EligiblePlayer,
  RoundConflict,
  KeeperSelectionsResponse,
  SelectPlayerResult,
  BumpPlayerResult,
  FinalizeResult,
  DeadlineState,
  DeadlineInfo,
} from "./selection-types";

import type {
  KeeperSelectionInfo,
  EligiblePlayer,
  RoundConflict,
  KeeperSelectionsResponse,
  SelectPlayerResult,
  BumpPlayerResult,
  FinalizeResult,
  DeadlineState,
  DeadlineInfo,
} from "./selection-types";

// ============= DEADLINE HELPERS =============

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Calculate deadline state based on current time
 */
export function getDeadlineState(deadline: Date): DeadlineState {
  const now = new Date();
  const deadlineTime = new Date(deadline).getTime();
  const nowTime = now.getTime();
  const timeUntilDeadline = deadlineTime - nowTime;

  if (timeUntilDeadline <= 0) {
    return 'passed';
  } else if (timeUntilDeadline <= ONE_DAY_MS) {
    return 'urgent';
  } else if (timeUntilDeadline <= SEVEN_DAYS_MS) {
    return 'approaching';
  } else {
    return 'open';
  }
}

/**
 * Get full deadline info including message
 */
export function getDeadlineInfo(deadline: Date, isFinalized: boolean): DeadlineInfo {
  const state = getDeadlineState(deadline);
  const deadlineDate = new Date(deadline);

  let message: string;
  let canModify: boolean;

  if (isFinalized) {
    message = 'Selections finalized';
    canModify = false;
  } else {
    switch (state) {
      case 'passed':
        message = 'Deadline has passed - selections locked';
        canModify = false;
        break;
      case 'urgent':
        message = `Deadline in less than 24 hours! (${deadlineDate.toLocaleDateString()})`;
        canModify = true;
        break;
      case 'approaching':
        message = `Deadline approaching: ${deadlineDate.toLocaleDateString()}`;
        canModify = true;
        break;
      case 'open':
      default:
        message = `Deadline: ${deadlineDate.toLocaleDateString()}`;
        canModify = true;
        break;
    }
  }

  return {
    state,
    message,
    deadline: deadlineDate,
    canModify,
  };
}

/**
 * Check if modifications are allowed (not past deadline and not finalized)
 */
export function canModifySelections(deadline: Date, isFinalized: boolean): boolean {
  if (isFinalized) return false;
  return getDeadlineState(deadline) !== 'passed';
}

// ============= GET SELECTIONS =============

/**
 * Get all keeper selections and eligible players for a team
 */
export async function getTeamKeeperSelections(
  teamId: string,
  targetYear: number
): Promise<KeeperSelectionsResponse | null> {
  // Get team info
  const team = await db.team.findUnique({
    where: { id: teamId },
  });

  if (!team) {
    return null;
  }

  // Get season info
  const season = await db.season.findUnique({
    where: { year: targetYear },
  });

  if (!season) {
    return null;
  }

  // Get existing selections for this team/season
  const existingSelections = await db.keeperSelection.findMany({
    where: {
      teamId,
      seasonYear: targetYear,
    },
    include: {
      player: true,
      originalAcquisition: true,
    },
  });

  // Get all players on roster (not dropped)
  const rosterAcquisitions = await db.playerAcquisition.findMany({
    where: {
      teamId,
      droppedDate: null,
    },
    include: {
      player: true,
    },
  });

  // Collect ALL unique player IDs we need costs for
  const rosterPlayerIds = rosterAcquisitions.map((a) => a.playerId);
  const selectionPlayerIds = existingSelections.map((s) => s.playerId);
  const allPlayerIds = [...new Set([...rosterPlayerIds, ...selectionPlayerIds])];

  // BATCH: Get all keeper costs in ONE call (reduces ~168 queries to ~9-11)
  const keeperCosts = await getPlayerKeeperCostsBatch(
    allPlayerIds,
    team.slotId,
    targetYear
  );

  // Build eligible players (in-memory lookups, no DB calls)
  const selectedPlayerIds = new Set(existingSelections.map((s) => s.playerId));
  const eligiblePlayersMap = new Map<string, EligiblePlayer>();

  for (const acq of rosterAcquisitions) {
    if (eligiblePlayersMap.has(acq.playerId)) {
      continue;
    }

    const keeperResult = keeperCosts.get(acq.playerId);

    if (keeperResult && keeperResult.calculation.isEligible) {
      eligiblePlayersMap.set(acq.playerId, {
        player: {
          id: acq.player.id,
          firstName: acq.player.firstName,
          lastName: acq.player.lastName,
          position: acq.player.position,
        },
        keeperCost: keeperResult.calculation.keeperRound!,
        isSelected: selectedPlayerIds.has(acq.playerId),
      });
    }
  }

  const eligiblePlayers = Array.from(eligiblePlayersMap.values());

  // Build selection info with calculated vs final round (in-memory lookups)
  const selections: KeeperSelectionInfo[] = [];
  for (const sel of existingSelections) {
    const keeperResult = keeperCosts.get(sel.playerId);
    const calculatedRound = keeperResult?.calculation.keeperRound ?? sel.keeperRound;

    selections.push({
      id: sel.id,
      player: {
        id: sel.player.id,
        firstName: sel.player.firstName,
        lastName: sel.player.lastName,
        position: sel.player.position,
      },
      calculatedRound,
      finalRound: sel.keeperRound,
      isBumped: sel.keeperRound < calculatedRound,
      isFinalized: sel.isFinalized,
    });
  }

  // Detect conflicts
  const conflicts = detectConflicts(selections);

  // Check if all selections are finalized
  const isFinalized = existingSelections.length > 0 &&
    existingSelections.every(s => s.isFinalized);

  // Get deadline info
  const deadlineInfo = getDeadlineInfo(season.keeperDeadline, isFinalized);

  return {
    team: {
      id: team.id,
      teamName: team.teamName,
      seasonYear: team.seasonYear,
    },
    season: {
      year: season.year,
      totalRounds: season.totalRounds,
      keeperDeadline: season.keeperDeadline,
    },
    selections,
    eligiblePlayers,
    conflicts,
    isFinalized,
    deadlineInfo,
  };
}

// ============= SELECT PLAYER =============

/**
 * Add a player to keeper selections
 */
export async function selectPlayer(
  teamId: string,
  playerId: string,
  targetYear: number
): Promise<SelectPlayerResult> {
  // Check if player already selected
  const existing = await db.keeperSelection.findFirst({
    where: { teamId, playerId, seasonYear: targetYear },
  });

  if (existing) {
    return { success: false, error: "Player already selected" };
  }

  // Get team to find slotId
  const team = await db.team.findUnique({
    where: { id: teamId },
    select: { slotId: true },
  });

  if (!team) {
    return { success: false, error: "Team not found" };
  }

  // Get player's keeper cost
  const keeperResult = await getPlayerKeeperCost(playerId, team.slotId, targetYear);

  if (!keeperResult) {
    return { success: false, error: "Player not found on team" };
  }

  if (!keeperResult.calculation.isEligible) {
    return { success: false, error: "Player is not eligible to be kept" };
  }

  // Find the original acquisition for this player on this team
  const acquisition = await db.playerAcquisition.findFirst({
    where: {
      playerId,
      teamId,
      droppedDate: null,
    },
    orderBy: { acquisitionDate: "desc" },
  });

  if (!acquisition) {
    return { success: false, error: "No valid acquisition found" };
  }

  // Create selection (include slotId for slot-centric queries)
  const selection = await db.keeperSelection.create({
    data: {
      teamId,
      slotId: team?.slotId,
      playerId,
      seasonYear: targetYear,
      keeperRound: keeperResult.calculation.keeperRound!,
      yearsKept: keeperResult.calculation.yearsKept,
      originalAcquisitionId: acquisition.id,
      isFinalized: false,
    },
    include: {
      player: true,
    },
  });

  return {
    success: true,
    selection: {
      id: selection.id,
      player: {
        id: selection.player.id,
        firstName: selection.player.firstName,
        lastName: selection.player.lastName,
        position: selection.player.position,
      },
      calculatedRound: keeperResult.calculation.keeperRound!,
      finalRound: selection.keeperRound,
      isBumped: false,
      isFinalized: false,
    },
  };
}

// ============= REMOVE PLAYER =============

export async function removePlayer(
  teamId: string,
  playerId: string,
  targetYear: number
): Promise<{ success: boolean; error?: string }> {
  // Find the selection
  const selection = await db.keeperSelection.findFirst({
    where: { teamId, playerId, seasonYear: targetYear },
  });

  if (!selection) {
    return { success: false, error: "Selection not found" };
  }

  if (selection.isFinalized) {
    return { success: false, error: "Cannot remove finalized selection" };
  }

  // Delete the selection
  await db.keeperSelection.delete({
    where: { id: selection.id },
  });

  return { success: true };
}

// ============= BUMP PLAYER =============

/**
 * Bump a player to an earlier round to resolve a conflict
 */
export async function bumpPlayer(
  teamId: string,
  playerId: string,
  newRound: number,
  targetYear: number
): Promise<BumpPlayerResult> {
  // Find the selection
  const selection = await db.keeperSelection.findFirst({
    where: { teamId, playerId, seasonYear: targetYear },
    include: { player: true },
  });

  if (!selection) {
    return { success: false, error: "Selection not found" };
  }

  if (selection.isFinalized) {
    return { success: false, error: "Cannot modify finalized selection" };
  }

  // Get team to find slotId
  const team = await db.team.findUnique({
    where: { id: teamId },
    select: { slotId: true },
  });

  // Get original keeper cost
  const keeperResult = team
    ? await getPlayerKeeperCost(playerId, team.slotId, targetYear)
    : null;
  const originalCost = keeperResult?.calculation.keeperRound ?? selection.keeperRound;

  // Validate: newRound must be < original cost (earlier/better pick)
  if (newRound >= originalCost) {
    return {
      success: false,
      error: `Bump round must be earlier than ${originalCost} (got ${newRound})`
    };
  }

  // Validate: newRound must be >= 1
  if (newRound < 1) {
    return { success: false, error: "Round must be at least 1" };
  }

  // Validate: newRound must not conflict with another selection
  const conflicting = await db.keeperSelection.findFirst({
    where: {
      teamId,
      seasonYear: targetYear,
      keeperRound: newRound,
      NOT: { playerId },
    },
  });

  if (conflicting) {
    return { success: false, error: `Round ${newRound} is already used by another keeper` };
  }

  // Update the selection
  await db.keeperSelection.update({
    where: { id: selection.id },
    data: { keeperRound: newRound },
  });

  return { success: true, newRound };
}

/**
 * Get available bump options for a player (earlier rounds not in use)
 */
export async function getBumpOptions(
  teamId: string,
  playerId: string,
  targetYear: number
): Promise<number[]> {
  // Get the selection
  const selection = await db.keeperSelection.findFirst({
    where: { teamId, playerId, seasonYear: targetYear },
  });

  if (!selection) {
    return [];
  }

  // Get team to find slotId
  const team = await db.team.findUnique({
    where: { id: teamId },
    select: { slotId: true },
  });

  // Get original keeper cost
  const keeperResult = team
    ? await getPlayerKeeperCost(playerId, team.slotId, targetYear)
    : null;
  const originalCost = keeperResult?.calculation.keeperRound ?? selection.keeperRound;

  // Get all rounds currently used by this team
  const usedSelections = await db.keeperSelection.findMany({
    where: {
      teamId,
      seasonYear: targetYear,
      NOT: { playerId },  // Exclude current player
    },
    select: { keeperRound: true },
  });

  const usedRounds = new Set(usedSelections.map(s => s.keeperRound));

  // Find available earlier rounds
  const options: number[] = [];
  for (let round = originalCost - 1; round >= 1; round--) {
    if (!usedRounds.has(round)) {
      options.push(round);
    }
  }

  return options;
}

// ============= FINALIZE =============

/**
 * Finalize all keeper selections for a team
 */
export async function finalizeSelections(
  teamId: string,
  targetYear: number
): Promise<FinalizeResult> {
  // Get all selections
  const selections = await db.keeperSelection.findMany({
    where: { teamId, seasonYear: targetYear },
    include: { player: true },
  });

  if (selections.length === 0) {
    return { success: false, error: "No keepers selected" };
  }

  // Check if already finalized
  if (selections.some(s => s.isFinalized)) {
    return { success: false, error: "Selections already finalized" };
  }

  // Check for conflicts
  const selectionInfos: KeeperSelectionInfo[] = selections.map(sel => ({
    id: sel.id,
    player: {
      id: sel.player.id,
      firstName: sel.player.firstName,
      lastName: sel.player.lastName,
      position: sel.player.position,
    },
    calculatedRound: sel.keeperRound,
    finalRound: sel.keeperRound,
    isBumped: false,
    isFinalized: false,
  }));

  const conflicts = detectConflicts(selectionInfos);

  if (conflicts.length > 0) {
    return {
      success: false,
      error: `Unresolved conflicts at round(s): ${conflicts.map(c => c.round).join(", ")}`
    };
  }

  // Finalize all selections
  const finalizedAt = new Date();

  await db.keeperSelection.updateMany({
    where: { teamId, seasonYear: targetYear },
    data: {
      isFinalized: true,
      finalizedAt,
    },
  });

  return { success: true, finalizedAt };
}

// ============= HELPERS =============

/**
 * Detect round conflicts (multiple players at same round)
 */
function detectConflicts(selections: KeeperSelectionInfo[]): RoundConflict[] {
  const roundMap = new Map<number, KeeperSelectionInfo[]>();

  for (const sel of selections) {
    const round = sel.finalRound;
    const existing = roundMap.get(round) ?? [];
    existing.push(sel);
    roundMap.set(round, existing);
  }

  const conflicts: RoundConflict[] = [];

  for (const [round, players] of roundMap) {
    if (players.length > 1) {
      conflicts.push({
        round,
        players: players.map(p => ({
          id: p.player.id,
          name: `${p.player.firstName} ${p.player.lastName}`,
        })),
      });
    }
  }

  return conflicts;
}
