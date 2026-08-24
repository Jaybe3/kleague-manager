import { db } from "@/lib/db";
import { calculateKeeperCost } from "./calculator";
import { isRuleActive } from "@/lib/rules/rules-service";
import { getAllTeamNamesForSeason } from "@/lib/slots";
import type { KeeperCalculationInput, KeeperCalculationResult, PlayerKeeperInfo, KeeperRuleFlags } from "./types";
import { DEFAULT_RULE_FLAGS, RULE_CODE_TO_FLAG } from "./types";
import { resolveTradeBase, type ChainAcquisition } from "./chain";

/**
 * Result of getting a player's keeper info with calculated cost
 */
export interface PlayerKeeperCostResult {
  player: {
    id: string;
    firstName: string;
    lastName: string;
    position: string;
    playerMatchKey: string;
  };
  acquisition: {
    type: "DRAFT" | "FA";
    year: number;
    draftRound: number | null;
    draftPick: number | null;
  };
  calculation: KeeperCalculationResult;
}

/**
 * Team roster with keeper costs for each player
 */
export interface TeamRosterWithKeeperCosts {
  team: {
    id: string;
    teamName: string;
    slotId: number;
    seasonYear: number;
  };
  players: PlayerKeeperCostResult[];
  targetYear: number;
}

/**
 * Fetch all keeper rule flags for a given target year.
 * Uses isRuleActive() to check each rule against the target year.
 *
 * @param targetYear - The year to check rule activation for
 * @returns KeeperRuleFlags with all rules checked
 */
async function fetchRuleFlags(targetYear: number): Promise<KeeperRuleFlags> {
  const [
    keeperCostYear2,
    keeperCostYear3Plus,
    keeperIneligibility,
    trueFaRound15,
    tradeInheritsCost,
    faInheritsDraftRound,
    keeperRoundBump,
  ] = await Promise.all([
    isRuleActive("KEEPER_COST_YEAR_2", targetYear),
    isRuleActive("KEEPER_COST_YEAR_3_PLUS", targetYear),
    isRuleActive("KEEPER_INELIGIBILITY", targetYear),
    isRuleActive("TRUE_FA_ROUND_15", targetYear),
    isRuleActive("TRADE_INHERITS_COST", targetYear),
    isRuleActive("FA_INHERITS_DRAFT_ROUND", targetYear),
    isRuleActive("KEEPER_ROUND_BUMP", targetYear),
  ]);

  return {
    keeperCostYear2,
    keeperCostYear3Plus,
    keeperIneligibility,
    trueFaRound15,
    tradeInheritsCost,
    faInheritsDraftRound,
    keeperRoundBump,
  };
}

/**
 * Find the keeper base acquisition for cost calculation.
 *
 * KEY CBS BEHAVIOR: When you KEEP a player, CBS creates a NEW "DRAFT" record
 * each year at their keeper cost. So a kept player has MULTIPLE DRAFT records
 * on the same slot across seasons.
 *
 * CHAIN BREAK DETECTION (TASK-601):
 * A player's keeper clock is ONLY continuous if they have consecutive DRAFT
 * records on the same slot. If there's a gap (no DRAFT for a year), the chain
 * is broken and later acquisitions get a clean slate.
 *
 * Example: Danielle Hunter
 * - 2023 DRAFT R19 (original)
 * - 2024 DRAFT R19 (kept)
 * - 2025 FA (NOT kept - chain broken!)
 * → 2026 cost should be R15 (clean slate), NOT R11 (from 2023)
 *
 * COMPLETE RULES:
 * 1. CHAIN DETECTION: Walk backward from current season checking for continuous
 *    DRAFT records. If gap found, chain is broken - use current as base.
 * 2. CONTINUOUS KEEPER: If unbroken DRAFT chain exists, use earliest DRAFT
 *    in the chain as keeper base.
 * 3. TRADE: Trades preserve history. Follow chain back to original DRAFT
 *    (could be on different slot). Original drafter's year/round is keeper base.
 * 4. FA (same season as a draft): If player was DRAFTED by someone else THE SAME
 *    SEASON (then dropped), inherit that draft round.
 * 5. TRUE FA: If player was never drafted that season by anyone, use Round 15.
 *
 * @param playerId - The player's ID
 * @param slotId - The slot ID (to find the current active acquisition on this slot)
 * @param ruleFlags - Rule flags to control behavior (TASK-603)
 */
async function findKeeperBaseAcquisition(
  playerId: string,
  slotId: number,
  ruleFlags: KeeperRuleFlags = DEFAULT_RULE_FLAGS
) {
  // Step 1: Get the player's ACTIVE acquisition on this slot (droppedDate = null)
  const currentAcquisition = await db.playerAcquisition.findFirst({
    where: {
      playerId,
      team: { slotId },
      droppedDate: null,
    },
    orderBy: {
      acquisitionDate: "desc",
    },
    include: {
      player: true,
      team: true,
    },
  });

  if (!currentAcquisition) {
    return null; // Player not active on this slot
  }

  // Step 2: Find ALL acquisitions for this player on this SLOT (any season)
  const allSlotAcquisitions = await db.playerAcquisition.findMany({
    where: {
      playerId,
      team: {
        slotId: slotId,
      },
    },
    include: {
      player: true,
      team: true,
    },
    orderBy: {
      seasonYear: "asc", // Earliest first
    },
  });

  // Step 4: Group acquisitions by season
  const bySeasonMap = new Map<number, typeof allSlotAcquisitions>();
  for (const acq of allSlotAcquisitions) {
    const list = bySeasonMap.get(acq.seasonYear) || [];
    list.push(acq);
    bySeasonMap.set(acq.seasonYear, list);
  }

  // Step 5: CRITICAL - Check if current acquisition breaks the chain
  // If current acquisition is NOT a DRAFT, the chain is broken at THIS point
  // (An FA or TRADE in the current season means player was NOT kept from previous year)
  if (currentAcquisition.acquisitionType !== "DRAFT") {
    // Chain is broken - use current acquisition as base
    // But first check special cases for FA and TRADE

    if (currentAcquisition.acquisitionType === "TRADE") {
      // TRADE preserves the clock the player was already on - follow the trade
      // back to the acquisition it closed and resolve the chain there.
      // Only if TRADE_INHERITS_COST rule is enabled (TASK-603)
      if (ruleFlags.tradeInheritsCost) {
        const tradeBase = await findKeeperBaseThroughTrade(
          playerId,
          currentAcquisition
        );
        if (tradeBase) {
          return tradeBase;
        }
      }
      // Trail couldn't be followed or rule disabled - treat as FA
      return currentAcquisition;
    }

    if (currentAcquisition.acquisitionType === "FA") {
      // Check if FA_INHERITS_DRAFT_ROUND rule is enabled for the ACQUISITION YEAR (TASK-603)
      // The rule should be checked for when the FA pickup happened, not the target year
      // This ensures 2024 FA pickups don't inherit draft rounds (rule effective 2025+)
      const faInheritRuleActive = await isRuleActive(
        "FA_INHERITS_DRAFT_ROUND",
        currentAcquisition.seasonYear
      );

      if (faInheritRuleActive) {
        // Check if player was DRAFTED same season by ANY team
        const sameSeasonDraft = await db.playerAcquisition.findFirst({
          where: {
            playerId,
            acquisitionType: "DRAFT",
            seasonYear: currentAcquisition.seasonYear,
          },
          include: {
            player: true,
          },
        });

        if (sameSeasonDraft) {
          // Player was drafted this season by another team, then dropped
          // Inherit that draft round
          return sameSeasonDraft;
        }
      }

      // No draft this season OR rule disabled - true FA, return the FA acquisition (will use Round 15)
      return currentAcquisition;
    }

    // Unknown type - return current
    return currentAcquisition;
  }

  // Step 6: Current is DRAFT - walk backward to find the start of the keeper chain
  // A continuous keeper chain = consecutive DRAFT records each year
  let chainStart = currentAcquisition;
  const seasons = Array.from(bySeasonMap.keys()).sort((a, b) => a - b);
  const minSeason = seasons.length > 0 ? Math.min(...seasons) : currentAcquisition.seasonYear;

  for (let year = currentAcquisition.seasonYear - 1; year >= minSeason; year--) {
    const prevYearAcqs = bySeasonMap.get(year);

    // No record for previous year = chain broken
    if (!prevYearAcqs || prevYearAcqs.length === 0) {
      break;
    }

    // Check for DRAFT in previous year (kept players show as DRAFT)
    const draftAcq = prevYearAcqs.find((a) => a.acquisitionType === "DRAFT");

    if (draftAcq) {
      // Chain continues - this DRAFT is part of the keeper chain
      chainStart = draftAcq;
    } else {
      // No DRAFT = chain broken (player was FA/TRADE that year, not kept)
      break;
    }
  }

  // chainStart is a DRAFT - return it (this is the keeper base)
  return chainStart;
}

/**
 * Resolve the keeper base for a player currently held via a trade.
 *
 * A trade carries the clock the player was already on, so we follow the trade
 * back to the acquisition it closed - through further trades if he changed
 * hands more than once - and then resolve the chain on the team that drafted
 * him. This deliberately does NOT reach for his oldest draft on record: that
 * would cross seasons where he was released and re-drafted, and cross other
 * managers' teams, inflating his cost or making him ineligible outright.
 *
 * Returns null when the trail can't be followed, leaving the caller to treat
 * the trade as a fresh acquisition.
 *
 * @param playerId - The player's ID
 * @param tradeAcquisition - The active TRADE acquisition to trace back from
 */
async function findKeeperBaseThroughTrade(
  playerId: string,
  tradeAcquisition: AcquisitionWithIncludes
) {
  // Full history across every team - a trade can point at any slot
  const history = await db.playerAcquisition.findMany({
    where: { playerId },
    include: { player: true, team: true },
    orderBy: { seasonYear: "asc" },
  });

  const slotByTeamId = await loadSlotByTeamId(history);
  const rows = toChainRows(history, slotByTeamId);

  const tradeRow = rows.find(
    (r) =>
      r.acq.acquisitionType === tradeAcquisition.acquisitionType &&
      r.acq.seasonYear === tradeAcquisition.seasonYear &&
      r.acq.draftRound === tradeAcquisition.draftRound &&
      r.slotId === (tradeAcquisition.slotId ?? tradeAcquisition.team.slotId) &&
      r.droppedDate == null
  );

  if (!tradeRow) return null;

  const base = resolveTradeBase(rows, tradeRow);
  if (!base) return null;

  // The trail can end at a free-agent pickup - that's where the clock
  // restarted. The same inheritance rule applies as for any FA: if someone
  // drafted him that season, the pickup carries that round.
  if (base.acq.acquisitionType === "FA") {
    const ruleActive = await isRuleActive(
      "FA_INHERITS_DRAFT_ROUND",
      base.acq.seasonYear
    );
    if (ruleActive) {
      const sameSeasonDraft = rows.find(
        (r) =>
          r.acq.acquisitionType === "DRAFT" &&
          r.acq.seasonYear === base.acq.seasonYear
      );
      if (sameSeasonDraft) {
        return sameSeasonDraft.acq;
      }
    }
  }

  return base.acq;
}

/**
 * Get keeper cost calculation for a specific player on a slot
 *
 * @param playerId - The player's ID
 * @param slotId - The slot ID (to verify player is on this slot)
 * @param targetYear - The year to calculate keeper cost for
 */
export async function getPlayerKeeperCost(
  playerId: string,
  slotId: number,
  targetYear: number
): Promise<PlayerKeeperCostResult | null> {
  // Fetch rule flags for the target year (TASK-603)
  const ruleFlags = await fetchRuleFlags(targetYear);

  // Find the keeper base acquisition (handles DRAFT, TRADE, FA correctly)
  const keeperBaseAcquisition = await findKeeperBaseAcquisition(playerId, slotId, ruleFlags);

  if (!keeperBaseAcquisition) {
    return null; // Player not active on this team or no valid acquisition found
  }

  // Determine acquisition type for calculation (TRADE uses underlying DRAFT/FA)
  const acquisitionType = keeperBaseAcquisition.acquisitionType === "TRADE"
    ? "FA" // If trade chain couldn't find draft, treat as FA
    : keeperBaseAcquisition.acquisitionType as "DRAFT" | "FA";

  // Check for commissioner override BEFORE calculating
  // Use ROSTER team (targetYear - 1) for override lookup - overrides are stored with roster team
  const rosterTeam = await db.team.findFirst({
    where: { slotId, seasonYear: targetYear - 1 },
  });

  const override = rosterTeam
    ? await db.keeperOverride.findUnique({
        where: {
          playerId_teamId_seasonYear: {
            playerId,
            teamId: rosterTeam.id,
            seasonYear: targetYear,
          },
        },
      })
    : null;

  // If override exists, use override round instead of calculated cost
  if (override) {
    return {
      player: {
        id: keeperBaseAcquisition.player.id,
        firstName: keeperBaseAcquisition.player.firstName,
        lastName: keeperBaseAcquisition.player.lastName,
        position: keeperBaseAcquisition.player.position,
        playerMatchKey: keeperBaseAcquisition.player.playerMatchKey,
      },
      acquisition: {
        type: acquisitionType,
        year: keeperBaseAcquisition.seasonYear,
        draftRound: keeperBaseAcquisition.draftRound,
        draftPick: keeperBaseAcquisition.draftPick,
      },
      calculation: {
        targetYear,
        acquisitionType,
        originalDraftRound: keeperBaseAcquisition.draftRound,
        acquisitionYear: keeperBaseAcquisition.seasonYear,
        yearsKept: targetYear - keeperBaseAcquisition.seasonYear,
        keeperRound: override.overrideRound,
        isEligible: true, // Override always makes player eligible
        baseRound: keeperBaseAcquisition.draftRound ?? 15,
        costReduction: 0, // Not applicable for overrides
        isOverride: true,
      },
    };
  }

  // No override - calculate normally
  // Build calculation input
  const input: KeeperCalculationInput = {
    acquisitionType,
    originalDraftRound: keeperBaseAcquisition.draftRound,
    acquisitionYear: keeperBaseAcquisition.seasonYear,
    targetYear,
  };

  // Calculate keeper cost with rule flags (TASK-603)
  const calculation = calculateKeeperCost(input, ruleFlags);

  return {
    player: {
      id: keeperBaseAcquisition.player.id,
      firstName: keeperBaseAcquisition.player.firstName,
      lastName: keeperBaseAcquisition.player.lastName,
      position: keeperBaseAcquisition.player.position,
      playerMatchKey: keeperBaseAcquisition.player.playerMatchKey,
    },
    acquisition: {
      type: acquisitionType,
      year: keeperBaseAcquisition.seasonYear,
      draftRound: keeperBaseAcquisition.draftRound,
      draftPick: keeperBaseAcquisition.draftPick,
    },
    calculation,
  };
}

/**
 * Batch version of getPlayerKeeperCost for performance.
 * Fetches all data upfront and processes in memory.
 *
 * Reduces ~5 queries per player to ~9-11 total queries.
 *
 * @param playerIds - Array of player IDs to calculate costs for
 * @param slotId - The slot ID (team's permanent position)
 * @param targetYear - The year to calculate keeper costs for
 * @returns Map of playerId -> PlayerKeeperCostResult (only includes eligible players)
 */
export async function getPlayerKeeperCostsBatch(
  playerIds: string[],
  slotId: number,
  targetYear: number
): Promise<Map<string, PlayerKeeperCostResult>> {
  if (playerIds.length === 0) {
    return new Map();
  }

  // 1. Fetch rule flags ONCE (not per player)
  const ruleFlags = await fetchRuleFlags(targetYear);

  // 2. Batch fetch ALL active acquisitions for these players on this slot
  const activeAcquisitions = await db.playerAcquisition.findMany({
    where: {
      playerId: { in: playerIds },
      team: { slotId },
      droppedDate: null,
    },
    include: {
      player: true,
      team: true,
    },
    orderBy: {
      acquisitionDate: "desc",
    },
  });

  // 3. Batch fetch ALL historical acquisitions for these players on this slot
  const allSlotAcquisitions = await db.playerAcquisition.findMany({
    where: {
      playerId: { in: playerIds },
      team: { slotId },
    },
    include: {
      player: true,
      team: true,
    },
    orderBy: {
      seasonYear: "asc",
    },
  });

  // 4. Identify players needing cross-slot queries
  const tradedPlayerIds: string[] = [];
  const fasNeeding2025Check: { playerId: string; seasonYear: number }[] = [];

  for (const acq of activeAcquisitions) {
    if (acq.acquisitionType === "TRADE" && ruleFlags.tradeInheritsCost) {
      tradedPlayerIds.push(acq.playerId);
    }
    if (acq.acquisitionType === "FA" && acq.seasonYear >= 2025) {
      fasNeeding2025Check.push({ playerId: acq.playerId, seasonYear: acq.seasonYear });
    }
  }

  // 5. Batch fetch the FULL cross-slot history for traded players.
  // Resolving a trade means following it back to the acquisition it closed,
  // which can sit on any slot - so drafts alone aren't enough.
  let crossSlotTradeHistory: typeof activeAcquisitions = [];
  if (tradedPlayerIds.length > 0) {
    crossSlotTradeHistory = await db.playerAcquisition.findMany({
      where: {
        playerId: { in: tradedPlayerIds },
      },
      include: {
        player: true,
        team: true,
      },
      orderBy: {
        seasonYear: "asc",
      },
    });
  }

  // 6. Batch fetch cross-slot same-season drafts for 2025+ FAs
  let crossSlotFaDrafts: typeof activeAcquisitions = [];
  if (fasNeeding2025Check.length > 0) {
    crossSlotFaDrafts = await db.playerAcquisition.findMany({
      where: {
        OR: fasNeeding2025Check.map((fa) => ({
          playerId: fa.playerId,
          acquisitionType: "DRAFT",
          seasonYear: fa.seasonYear,
        })),
      },
      include: {
        player: true,
        team: true,
      },
    });
  }

  // 7. Get ROSTER team (targetYear - 1) for override lookup
  const rosterTeam = await db.team.findFirst({
    where: { slotId, seasonYear: targetYear - 1 },
  });

  // 8. Batch fetch ALL overrides for this team/year
  const overrides = rosterTeam
    ? await db.keeperOverride.findMany({
        where: {
          teamId: rosterTeam.id,
          seasonYear: targetYear,
          playerId: { in: playerIds },
        },
      })
    : [];

  // === INDEX DATA FOR O(1) LOOKUPS ===

  // Active acquisition by playerId (most recent if multiple)
  const activeByPlayer = new Map<string, typeof activeAcquisitions[0]>();
  for (const acq of activeAcquisitions) {
    if (!activeByPlayer.has(acq.playerId)) {
      activeByPlayer.set(acq.playerId, acq);
    }
  }

  // All slot acquisitions grouped by playerId
  const historyByPlayer = new Map<string, typeof allSlotAcquisitions>();
  for (const acq of allSlotAcquisitions) {
    const list = historyByPlayer.get(acq.playerId) || [];
    list.push(acq);
    historyByPlayer.set(acq.playerId, list);
  }

  // Cross-slot chain rows per traded player, for tracing a trade backward
  const slotByTeamId = await loadSlotByTeamId(crossSlotTradeHistory);
  const tradeHistoryByPlayer = new Map<string, ChainRow[]>();
  for (const row of toChainRows(crossSlotTradeHistory, slotByTeamId)) {
    const list = tradeHistoryByPlayer.get(row.acq.playerId) || [];
    list.push(row);
    tradeHistoryByPlayer.set(row.acq.playerId, list);
  }

  // Cross-slot FA same-season drafts by playerId
  const faSameSeasonDraftByPlayer = new Map<string, typeof activeAcquisitions[0]>();
  for (const draft of crossSlotFaDrafts) {
    faSameSeasonDraftByPlayer.set(draft.playerId, draft);
  }

  // Overrides by playerId
  const overrideByPlayer = new Map(overrides.map((o) => [o.playerId, o]));

  // === CALCULATE KEEPER COSTS IN MEMORY ===

  const results = new Map<string, PlayerKeeperCostResult>();

  for (const playerId of playerIds) {
    const currentAcquisition = activeByPlayer.get(playerId);
    if (!currentAcquisition) {
      continue; // Player not active on this slot
    }

    // Find keeper base acquisition using in-memory data
    const keeperBase = findKeeperBaseFromData(
      playerId,
      currentAcquisition,
      historyByPlayer.get(playerId) || [],
      tradeHistoryByPlayer,
      faSameSeasonDraftByPlayer,
      ruleFlags
    );

    if (!keeperBase) {
      continue;
    }

    // Determine acquisition type for calculation
    const acquisitionType =
      keeperBase.acquisitionType === "TRADE"
        ? "FA"
        : (keeperBase.acquisitionType as "DRAFT" | "FA");

    // Check for override
    const override = overrideByPlayer.get(playerId);

    if (override) {
      // Override exists - use override round
      results.set(playerId, {
        player: {
          id: keeperBase.player.id,
          firstName: keeperBase.player.firstName,
          lastName: keeperBase.player.lastName,
          position: keeperBase.player.position,
          playerMatchKey: keeperBase.player.playerMatchKey,
        },
        acquisition: {
          type: acquisitionType,
          year: keeperBase.seasonYear,
          draftRound: keeperBase.draftRound,
          draftPick: keeperBase.draftPick,
        },
        calculation: {
          targetYear,
          acquisitionType,
          originalDraftRound: keeperBase.draftRound,
          acquisitionYear: keeperBase.seasonYear,
          yearsKept: targetYear - keeperBase.seasonYear,
          keeperRound: override.overrideRound,
          isEligible: true,
          baseRound: keeperBase.draftRound ?? 15,
          costReduction: 0,
          isOverride: true,
        },
      });
      continue;
    }

    // No override - calculate normally
    const input: KeeperCalculationInput = {
      acquisitionType,
      originalDraftRound: keeperBase.draftRound,
      acquisitionYear: keeperBase.seasonYear,
      targetYear,
    };

    const calculation = calculateKeeperCost(input, ruleFlags);

    results.set(playerId, {
      player: {
        id: keeperBase.player.id,
        firstName: keeperBase.player.firstName,
        lastName: keeperBase.player.lastName,
        position: keeperBase.player.position,
        playerMatchKey: keeperBase.player.playerMatchKey,
      },
      acquisition: {
        type: acquisitionType,
        year: keeperBase.seasonYear,
        draftRound: keeperBase.draftRound,
        draftPick: keeperBase.draftPick,
      },
      calculation,
    });
  }

  return results;
}

// Type for acquisition with player and team included
type AcquisitionWithIncludes = {
  playerId: string;
  acquisitionType: string;
  seasonYear: number;
  draftRound: number | null;
  draftPick: number | null;
  slotId?: number | null;
  acquisitionDate?: Date;
  droppedDate?: Date | null;
  tradedFromTeamId?: string | null;
  player: { id: string; firstName: string; lastName: string; position: string; playerMatchKey: string };
  team: { slotId: number };
};

/** An acquisition paired with the fields chain resolution reads. */
type ChainRow = ChainAcquisition & { acq: AcquisitionWithIncludes };

/**
 * Pair each acquisition with its chain fields, resolving the team a trade came
 * from down to its slot so a franchise is followed across renames.
 */
function toChainRows(
  rows: AcquisitionWithIncludes[],
  slotByTeamId: Map<string, number>
): ChainRow[] {
  return rows.map((r) => ({
    acq: r,
    seasonYear: r.seasonYear,
    slotId: r.slotId ?? r.team.slotId,
    acquisitionType: r.acquisitionType,
    acquisitionDate: r.acquisitionDate ?? new Date(0),
    droppedDate: r.droppedDate ?? null,
    tradedFromSlotId: r.tradedFromTeamId
      ? slotByTeamId.get(r.tradedFromTeamId) ?? null
      : null,
  }));
}

/** Map the team ids a set of trades point back to onto their slots. */
async function loadSlotByTeamId(
  rows: { tradedFromTeamId?: string | null }[]
): Promise<Map<string, number>> {
  const teamIds = [
    ...new Set(
      rows.map((r) => r.tradedFromTeamId).filter((id): id is string => !!id)
    ),
  ];
  if (teamIds.length === 0) return new Map();
  const teams = await db.team.findMany({
    where: { id: { in: teamIds } },
    select: { id: true, slotId: true },
  });
  return new Map(teams.map((t) => [t.id, t.slotId]));
}

/**
 * Pure function to find keeper base acquisition from pre-fetched data.
 * Mirrors the logic of findKeeperBaseAcquisition but uses in-memory data.
 */
function findKeeperBaseFromData(
  playerId: string,
  currentAcquisition: AcquisitionWithIncludes,
  allSlotAcquisitions: AcquisitionWithIncludes[],
  tradeHistoryByPlayer: Map<string, ChainRow[]>,
  faSameSeasonDraftByPlayer: Map<string, AcquisitionWithIncludes>,
  ruleFlags: KeeperRuleFlags
): AcquisitionWithIncludes | null {
  // Group by season
  const bySeasonMap = new Map<number, AcquisitionWithIncludes[]>();
  for (const acq of allSlotAcquisitions) {
    const list = bySeasonMap.get(acq.seasonYear) || [];
    list.push(acq);
    bySeasonMap.set(acq.seasonYear, list);
  }

  // Check if current acquisition breaks the chain
  if (currentAcquisition.acquisitionType !== "DRAFT") {
    // TRADE case
    if (currentAcquisition.acquisitionType === "TRADE") {
      if (ruleFlags.tradeInheritsCost) {
        const rows = tradeHistoryByPlayer.get(playerId) || [];
        const tradeRow = rows.find(
          (r) =>
            r.acq.acquisitionType === "TRADE" &&
            r.acq.seasonYear === currentAcquisition.seasonYear &&
            r.slotId ===
              (currentAcquisition.slotId ?? currentAcquisition.team.slotId) &&
            r.droppedDate == null
        );
        const base = tradeRow ? resolveTradeBase(rows, tradeRow) : null;
        if (base) {
          // Trail ended at a free-agent pickup - apply the same same-season
          // draft inheritance an FA acquisition would get.
          if (
            base.acq.acquisitionType === "FA" &&
            base.acq.seasonYear >= 2025 &&
            ruleFlags.faInheritsDraftRound
          ) {
            const sameSeasonDraft = rows.find(
              (r) =>
                r.acq.acquisitionType === "DRAFT" &&
                r.acq.seasonYear === base.acq.seasonYear
            );
            if (sameSeasonDraft) {
              return sameSeasonDraft.acq;
            }
          }
          return base.acq;
        }
      }
      return currentAcquisition;
    }

    // FA case
    if (currentAcquisition.acquisitionType === "FA") {
      // Only check same-season draft for 2025+ FAs
      if (currentAcquisition.seasonYear >= 2025 && ruleFlags.faInheritsDraftRound) {
        const sameSeasonDraft = faSameSeasonDraftByPlayer.get(playerId);
        if (sameSeasonDraft) {
          return sameSeasonDraft;
        }
      }
      return currentAcquisition;
    }

    // Unknown type
    return currentAcquisition;
  }

  // Current is DRAFT - walk backward to find chain start
  let chainStart = currentAcquisition;
  const seasons = Array.from(bySeasonMap.keys()).sort((a, b) => a - b);
  const minSeason = seasons.length > 0 ? Math.min(...seasons) : currentAcquisition.seasonYear;

  for (let year = currentAcquisition.seasonYear - 1; year >= minSeason; year--) {
    const prevYearAcqs = bySeasonMap.get(year);

    if (!prevYearAcqs || prevYearAcqs.length === 0) {
      break;
    }

    const draftAcq = prevYearAcqs.find((a) => a.acquisitionType === "DRAFT");

    if (draftAcq) {
      chainStart = draftAcq;
    } else {
      break;
    }
  }

  return chainStart;
}

/**
 * Get all players on a team's roster with their keeper costs
 *
 * @param teamId - The team's ID
 * @param targetYear - The year to calculate keeper costs for
 */
export async function getTeamRosterWithKeeperCosts(
  teamId: string,
  targetYear: number
): Promise<TeamRosterWithKeeperCosts | null> {
  // Get team info
  const team = await db.team.findUnique({
    where: { id: teamId },
  });

  if (!team) {
    return null;
  }

  // Get all players currently on this team (not dropped)
  // Only include acquisitions where droppedDate is null (still on roster)
  const acquisitions = await db.playerAcquisition.findMany({
    where: {
      teamId,
      droppedDate: null,
    },
    include: {
      player: true,
    },
    orderBy: {
      acquisitionDate: "desc",
    },
  });

  // Deduplicate to get unique players (most recent acquisition wins)
  const playerMap = new Map<string, typeof acquisitions[0]>();
  for (const acq of acquisitions) {
    if (!playerMap.has(acq.playerId)) {
      playerMap.set(acq.playerId, acq);
    }
  }

  // Calculate keeper costs for each player
  const players: PlayerKeeperCostResult[] = [];

  for (const [playerId] of playerMap) {
    const result = await getPlayerKeeperCost(playerId, team.slotId, targetYear);
    if (result) {
      players.push(result);
    }
  }

  // Sort by keeper round (eligible first, then by round ascending)
  players.sort((a, b) => {
    // Eligible players first
    if (a.calculation.isEligible && !b.calculation.isEligible) return -1;
    if (!a.calculation.isEligible && b.calculation.isEligible) return 1;

    // Both eligible: sort by keeper round (lower round = earlier pick = more valuable)
    if (a.calculation.isEligible && b.calculation.isEligible) {
      return (a.calculation.keeperRound ?? 0) - (b.calculation.keeperRound ?? 0);
    }

    // Both ineligible: sort by name
    return a.player.lastName.localeCompare(b.player.lastName);
  });

  return {
    team: {
      id: team.id,
      teamName: team.teamName,
      slotId: team.slotId,
      seasonYear: team.seasonYear,
    },
    players,
    targetYear,
  };
}

/**
 * Get keeper costs for all teams in a season
 * 
 * @param seasonYear - The season year (for finding teams)
 * @param targetYear - The year to calculate keeper costs for
 */
export async function getAllTeamsKeeperCosts(
  seasonYear: number,
  targetYear: number
): Promise<TeamRosterWithKeeperCosts[]> {
  const teams = await db.team.findMany({
    where: { seasonYear },
    orderBy: { slotId: "asc" },
  });

  const results: TeamRosterWithKeeperCosts[] = [];

  for (const team of teams) {
    const roster = await getTeamRosterWithKeeperCosts(team.id, targetYear);
    if (roster) {
      results.push(roster);
    }
  }

  return results;
}

/**
 * A single player row for the league-wide "All Players" list.
 */
export interface AllPlayersRow {
  playerId: string;
  firstName: string;
  lastName: string;
  position: string;
  slotId: number;
  ownerTeamName: string;
  acquisitionType: "DRAFT" | "FA";
  yearsKept: number;
  keeperRound: number | null;
  isEligible: boolean;
  isOverride: boolean;
}

/**
 * Get every player on every team's roster for a season, with keeper
 * eligibility resolved for the target (keeper) year.
 *
 * Rosters are read from the prior season's non-dropped acquisitions
 * (rosterYear = targetYear - 1). Eligibility is computed per slot via the
 * batched calculator, so trade/FA inheritance, rule flags, and commissioner
 * overrides are all honored.
 *
 * @param rosterYear - The season whose rosters to list (targetYear - 1)
 * @param targetYear - The keeper year to compute eligibility for
 */
export async function getAllPlayersWithKeeperStatus(
  rosterYear: number,
  targetYear: number
): Promise<AllPlayersRow[]> {
  const teams = await db.team.findMany({
    where: { seasonYear: rosterYear },
    orderBy: { slotId: "asc" },
  });

  const teamNames = await getAllTeamNamesForSeason(rosterYear);
  const rows: AllPlayersRow[] = [];

  for (const team of teams) {
    // Players currently on this roster (not dropped)
    const acquisitions = await db.playerAcquisition.findMany({
      where: { teamId: team.id, droppedDate: null },
      include: { player: true },
      orderBy: { acquisitionDate: "desc" },
    });

    // Deduplicate to unique players (most recent acquisition wins)
    const playerMap = new Map<string, (typeof acquisitions)[0]>();
    for (const acq of acquisitions) {
      if (!playerMap.has(acq.playerId)) {
        playerMap.set(acq.playerId, acq);
      }
    }

    const playerIds = Array.from(playerMap.keys());
    const costs = await getPlayerKeeperCostsBatch(playerIds, team.slotId, targetYear);
    const ownerTeamName = teamNames.get(team.slotId) ?? `Slot ${team.slotId}`;

    for (const [playerId, acq] of playerMap) {
      const result = costs.get(playerId);

      if (result) {
        rows.push({
          playerId,
          firstName: result.player.firstName,
          lastName: result.player.lastName,
          position: result.player.position,
          slotId: team.slotId,
          ownerTeamName,
          acquisitionType: result.acquisition.type,
          yearsKept: result.calculation.yearsKept,
          keeperRound: result.calculation.isEligible
            ? result.calculation.keeperRound
            : null,
          isEligible: result.calculation.isEligible,
          isOverride: result.calculation.isOverride ?? false,
        });
      } else {
        // Couldn't resolve a keeper base (e.g. no valid acquisition chain).
        // Still list the player so the roster view is complete.
        rows.push({
          playerId,
          firstName: acq.player.firstName,
          lastName: acq.player.lastName,
          position: acq.player.position,
          slotId: team.slotId,
          ownerTeamName,
          acquisitionType: acq.acquisitionType === "DRAFT" ? "DRAFT" : "FA",
          yearsKept: 0,
          keeperRound: null,
          isEligible: false,
          isOverride: false,
        });
      }
    }
  }

  return rows;
}

/**
 * Get players with round conflicts (multiple players at same keeper round)
 * 
 * @param teamId - The team's ID
 * @param targetYear - The year to check conflicts for
 */
export async function getKeeperRoundConflicts(
  teamId: string,
  targetYear: number
): Promise<Map<number, PlayerKeeperCostResult[]>> {
  const roster = await getTeamRosterWithKeeperCosts(teamId, targetYear);

  if (!roster) {
    return new Map();
  }

  // Group eligible players by keeper round
  const roundMap = new Map<number, PlayerKeeperCostResult[]>();

  for (const player of roster.players) {
    if (player.calculation.isEligible && player.calculation.keeperRound !== null) {
      const round = player.calculation.keeperRound;
      const existing = roundMap.get(round) ?? [];
      existing.push(player);
      roundMap.set(round, existing);
    }
  }

  // Filter to only rounds with conflicts (2+ players)
  const conflicts = new Map<number, PlayerKeeperCostResult[]>();
  for (const [round, players] of roundMap) {
    if (players.length > 1) {
      conflicts.set(round, players);
    }
  }

  return conflicts;
}

/**
 * Get the current/active season year
 */
export async function getCurrentSeasonYear(): Promise<number> {
  const activeSeason = await db.season.findFirst({
    where: { isActive: true },
    select: { year: true },
  });

  if (activeSeason) {
    return activeSeason.year;
  }

  // Fallback: get the most recent season
  const latestSeason = await db.season.findFirst({
    orderBy: { year: "desc" },
    select: { year: true },
  });

  return latestSeason?.year ?? new Date().getFullYear();
}

/**
 * Get team by manager's user ID
 * Uses TeamSlot.managerId (slot-centric) to find the manager's slot,
 * then looks up the Team for the requested season.
 * Falls back to most recent team if no team exists for the requested season.
 */
export async function getTeamByManagerId(
  managerId: string,
  seasonYear: number
): Promise<{ id: string; teamName: string; slotId: number } | null> {
  // Find the slot this manager owns (from TeamSlot, not Team)
  const slot = await db.teamSlot.findFirst({
    where: { managerId },
  });

  if (!slot) {
    // Fallback: Check Team.managerId for backwards compatibility
    const legacyTeam = await db.team.findFirst({
      where: { managerId },
      orderBy: { seasonYear: "desc" },
      select: { id: true, teamName: true, slotId: true },
    });
    return legacyTeam;
  }

  // Found the manager's slot - now get the team for the requested season
  let team = await db.team.findFirst({
    where: {
      slotId: slot.id,
      seasonYear: seasonYear,
    },
    select: {
      id: true,
      teamName: true,
      slotId: true,
    },
  });

  // If no team for requested season, fall back to most recent team
  if (!team) {
    team = await db.team.findFirst({
      where: { slotId: slot.id },
      orderBy: { seasonYear: "desc" },
      select: {
        id: true,
        teamName: true,
        slotId: true,
      },
    });
  }

  return team;
}

/**
 * Get the manager's slot ID.
 * Returns null if manager doesn't have a slot assigned.
 */
export async function getSlotByManagerId(
  managerId: string
): Promise<number | null> {
  const slot = await db.teamSlot.findFirst({
    where: { managerId },
  });
  return slot?.id ?? null;
}
