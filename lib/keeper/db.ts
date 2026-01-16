import { db } from "@/lib/db";
import { calculateKeeperCost } from "./calculator";
import type { KeeperCalculationInput } from "./types";

/**
 * Get all eligible keepers for a team in a target year
 */
export async function getTeamEligibleKeepers(
  teamId: string,
  targetYear: number
) {
  // Get all current players on the team from previous season
  const acquisitions = await db.playerAcquisition.findMany({
    where: {
      teamId,
      seasonYear: targetYear - 1,
    },
    include: {
      player: true,
    },
  });

  const results = [];

  for (const acq of acquisitions) {
    // Find original acquisition (DRAFT or FA, not TRADE)
    const originalAcq = await db.playerAcquisition.findFirst({
      where: {
        playerId: acq.playerId,
        acquisitionType: { in: ["DRAFT", "FA"] },
      },
      orderBy: {
        acquisitionDate: "asc",
      },
    });

    if (!originalAcq) continue;

    const input: KeeperCalculationInput = {
      acquisitionType: originalAcq.acquisitionType as "DRAFT" | "FA",
      originalDraftRound: originalAcq.draftRound,
      acquisitionYear: originalAcq.seasonYear,
      targetYear,
    };

    const calculation = calculateKeeperCost(input);
    
    results.push({
      player: acq.player,
      ...calculation,
    });
  }

  return results;
}
