/**
 * TASK-604b: Slot 10 Keeper Cost Audit (Enhanced)
 *
 * Verifies all players on Slot 10 show correct keeper costs after
 * TASK-601 chain break detection fix.
 *
 * Shows BOTH calculated cost (without override) AND final cost (with override if any).
 */

import { PrismaClient } from "@prisma/client";
import { calculateKeeperCost } from "../lib/keeper/calculator";

const db = new PrismaClient();

interface AuditResult {
  playerName: string;
  position: string;
  history: string[];
  chainAnalysis: string;
  baseAcquisition: string;
  calculatedCost: string;
  hasOverride: boolean;
  overrideValue: number | null;
  finalCost: string;
}

async function auditSlot10() {
  console.log("=== SLOT 10 KEEPER COST AUDIT (ENHANCED) ===\n");

  // Get the 2025 team for Slot 10
  const team2025 = await db.team.findFirst({
    where: { slotId: 10, seasonYear: 2025 },
  });

  if (!team2025) {
    console.log("ERROR: No 2025 team found for Slot 10");
    return;
  }

  console.log(`Team: ${team2025.teamName} (2025)`);
  console.log(`Team ID: ${team2025.id}`);
  console.log("");

  // Get all active players on this team
  const activeAcquisitions = await db.playerAcquisition.findMany({
    where: {
      teamId: team2025.id,
      droppedDate: null,
    },
    include: {
      player: true,
    },
    orderBy: {
      player: { lastName: "asc" },
    },
  });

  // Deduplicate (most recent acquisition wins)
  const playerMap = new Map<string, (typeof activeAcquisitions)[0]>();
  for (const acq of activeAcquisitions) {
    if (!playerMap.has(acq.playerId)) {
      playerMap.set(acq.playerId, acq);
    }
  }

  const results: AuditResult[] = [];
  let withOverrides = 0;
  let withoutOverrides = 0;

  for (const [playerId, currentAcq] of playerMap) {
    const player = currentAcq.player;
    console.log(`--- ${player.firstName} ${player.lastName} (${player.position}) ---`);

    // Get full acquisition history for this player on Slot 10
    const slot10History = await db.playerAcquisition.findMany({
      where: {
        playerId,
        team: { slotId: 10 },
      },
      include: {
        team: { select: { slotId: true, seasonYear: true } },
      },
      orderBy: { seasonYear: "asc" },
    });

    // Also get history on other slots for context
    const otherSlotHistory = await db.playerAcquisition.findMany({
      where: {
        playerId,
        team: { slotId: { not: 10 } },
      },
      include: {
        team: { select: { slotId: true, seasonYear: true } },
      },
      orderBy: { seasonYear: "asc" },
    });

    console.log("Acquisition History:");
    const historyLines: string[] = [];

    // Show other slot history first (for context)
    for (const acq of otherSlotHistory) {
      const line = `  ${acq.seasonYear} | Slot ${acq.team.slotId} | ${acq.acquisitionType} R${acq.draftRound ?? "-"}`;
      console.log(line);
      historyLines.push(line);
    }

    // Show Slot 10 history
    for (const acq of slot10History) {
      const dropped = acq.droppedDate ? " (dropped)" : "";
      const line = `  ${acq.seasonYear} | Slot ${acq.team.slotId} | ${acq.acquisitionType} R${acq.draftRound ?? "-"}${dropped}`;
      console.log(line);
      historyLines.push(line);
    }

    // Analyze chain
    let chainAnalysis = "";
    let baseAcquisition = "";

    // Group Slot 10 acquisitions by season
    const bySeasonMap = new Map<number, typeof slot10History>();
    for (const acq of slot10History) {
      const list = bySeasonMap.get(acq.seasonYear) || [];
      list.push(acq);
      bySeasonMap.set(acq.seasonYear, list);
    }

    // Find the current (most recent) active acquisition on Slot 10
    // Sort descending by season to get most recent first
    const sortedSlot10 = [...slot10History].sort((a, b) => b.seasonYear - a.seasonYear);
    const currentSlot10Acq = sortedSlot10.find((a) => !a.droppedDate);

    // Variables for keeper calculation
    let acquisitionType: "DRAFT" | "FA" = "FA";
    let acquisitionYear = 2025;
    let originalDraftRound: number | null = null;

    if (!currentSlot10Acq) {
      chainAnalysis = "No active acquisition on Slot 10";
      baseAcquisition = "N/A";
    } else if (currentSlot10Acq.acquisitionType !== "DRAFT") {
      // Current is not DRAFT - chain is broken
      chainAnalysis = `${currentSlot10Acq.seasonYear} is ${currentSlot10Acq.acquisitionType} (not DRAFT) → Chain BROKEN`;

      if (currentSlot10Acq.acquisitionType === "FA") {
        // Check for same-season draft by anyone
        const sameSeasonDraft = await db.playerAcquisition.findFirst({
          where: {
            playerId,
            acquisitionType: "DRAFT",
            seasonYear: currentSlot10Acq.seasonYear,
          },
        });

        if (sameSeasonDraft) {
          baseAcquisition = `${currentSlot10Acq.seasonYear} DRAFT R${sameSeasonDraft.draftRound} (same-season inheritance)`;
          acquisitionType = "DRAFT";
          acquisitionYear = sameSeasonDraft.seasonYear;
          originalDraftRound = sameSeasonDraft.draftRound;
        } else {
          baseAcquisition = `${currentSlot10Acq.seasonYear} FA (clean slate, true FA)`;
          acquisitionType = "FA";
          acquisitionYear = currentSlot10Acq.seasonYear;
        }
      } else if (currentSlot10Acq.acquisitionType === "TRADE") {
        // Find original draft
        const originalDraft = await db.playerAcquisition.findFirst({
          where: { playerId, acquisitionType: "DRAFT" },
          orderBy: { seasonYear: "asc" },
        });
        if (originalDraft) {
          baseAcquisition = `${originalDraft.seasonYear} DRAFT R${originalDraft.draftRound} (trade preserves history)`;
          acquisitionType = "DRAFT";
          acquisitionYear = originalDraft.seasonYear;
          originalDraftRound = originalDraft.draftRound;
        } else {
          baseAcquisition = `${currentSlot10Acq.seasonYear} TRADE (no original draft found)`;
          acquisitionType = "FA";
          acquisitionYear = currentSlot10Acq.seasonYear;
        }
      }
    } else {
      // Current is DRAFT - walk backward to find chain start
      let chainStart = currentSlot10Acq;
      const seasons = Array.from(bySeasonMap.keys()).sort((a, b) => a - b);
      const minSeason = Math.min(...seasons);

      for (let year = currentSlot10Acq.seasonYear - 1; year >= minSeason; year--) {
        const prevYearAcqs = bySeasonMap.get(year);
        if (!prevYearAcqs || prevYearAcqs.length === 0) break;

        const draftAcq = prevYearAcqs.flat().find((a) => a.acquisitionType === "DRAFT");
        if (draftAcq) {
          chainStart = draftAcq;
        } else {
          break;
        }
      }

      if (chainStart === currentSlot10Acq) {
        chainAnalysis = `Fresh DRAFT in ${currentSlot10Acq.seasonYear} (no prior history on slot)`;
      } else {
        chainAnalysis = `Continuous DRAFT chain from ${chainStart.seasonYear} to ${currentSlot10Acq.seasonYear}`;
      }
      baseAcquisition = `${chainStart.seasonYear} DRAFT R${chainStart.draftRound}`;
      acquisitionType = "DRAFT";
      acquisitionYear = chainStart.seasonYear;
      originalDraftRound = chainStart.draftRound;
    }

    console.log(`\nChain Analysis: ${chainAnalysis}`);
    console.log(`Base Acquisition: ${baseAcquisition}`);

    // Calculate keeper cost (without override)
    const calcResult = calculateKeeperCost({
      acquisitionType,
      originalDraftRound,
      acquisitionYear,
      targetYear: 2026,
    });

    let calculatedCost = "";
    if (calcResult.isEligible) {
      calculatedCost = `R${calcResult.keeperRound}`;
    } else {
      calculatedCost = `INELIGIBLE (R${calcResult.baseRound} - ${calcResult.costReduction} = R${calcResult.baseRound - calcResult.costReduction})`;
    }

    // Check for override
    const override = await db.keeperOverride.findFirst({
      where: {
        playerId,
        teamId: team2025.id,
        seasonYear: 2026,
      },
    });

    const hasOverride = override !== null;
    const overrideValue = override?.overrideRound ?? null;

    let finalCost = "";
    if (hasOverride) {
      finalCost = `R${overrideValue} (OVERRIDE)`;
      withOverrides++;
    } else {
      finalCost = calculatedCost;
      withoutOverrides++;
    }

    console.log(`\nCalculated Cost: ${calculatedCost}`);
    if (hasOverride) {
      console.log(`Override:        R${overrideValue}`);
    }
    console.log(`Final Cost:      ${finalCost}`);
    console.log("");

    results.push({
      playerName: `${player.firstName} ${player.lastName}`,
      position: player.position,
      history: historyLines,
      chainAnalysis,
      baseAcquisition,
      calculatedCost,
      hasOverride,
      overrideValue,
      finalCost,
    });
  }

  // Summary
  console.log("=== SUMMARY ===");
  console.log(`Total Players: ${results.length}`);
  console.log(`Without Overrides: ${withoutOverrides}`);
  console.log(`With Overrides: ${withOverrides}`);

  if (withOverrides > 0) {
    console.log("\n=== PLAYERS WITH OVERRIDES ===");
    for (const r of results.filter((r) => r.hasOverride)) {
      console.log(`- ${r.playerName}: Calculated=${r.calculatedCost}, Override=R${r.overrideValue}, Final=${r.finalCost}`);
    }
  }

  await db.$disconnect();
}

auditSlot10().catch(async (e) => {
  console.error("Error:", e);
  await db.$disconnect();
  process.exit(1);
});
