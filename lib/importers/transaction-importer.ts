import { db } from "@/lib/db";
import type { ParsedTransaction } from "./types";
import { findOrCreatePlayer, getTeamId } from "./draft-importer";
import { isValidTeamName } from "./team-mapper";

// ============= Transaction Import =============

export interface TransactionImportResult {
  faSigningsCreated: number;
  tradesCreated: number;
  playersCreated: number;
  errors: string[];
  warnings: string[];
}

/**
 * Import transactions (FA signings and trades) into the database
 */
export async function importTransactions(
  transactions: ParsedTransaction[]
): Promise<TransactionImportResult> {
  const result: TransactionImportResult = {
    faSigningsCreated: 0,
    tradesCreated: 0,
    playersCreated: 0,
    errors: [],
    warnings: [],
  };

  // Track created players to count accurately
  const createdPlayers = new Set<string>();

  for (const tx of transactions) {
    try {
      // Skip drops - we only import acquisitions
      if (tx.transactionType === "DROP") {
        continue;
      }

      // Validate team name (async check)
      const isValid = await isValidTeamName(tx.teamName);
      if (!isValid) {
        result.errors.push(
          `Unknown team: "${tx.teamName}" for player ${tx.player.firstName} ${tx.player.lastName}`
        );
        continue;
      }

      // Get team ID (team should already exist from draft import)
      const teamId = await getTeamId(tx.teamName, tx.seasonYear);
      if (!teamId) {
        result.errors.push(
          `Team not found: "${tx.teamName}" for season ${tx.seasonYear}. Run draft import first.`
        );
        continue;
      }

      // Find or create player
      const existingPlayer = await db.player.findUnique({
        where: { playerMatchKey: tx.player.playerMatchKey },
      });

      let playerId: string;
      if (existingPlayer) {
        playerId = existingPlayer.id;
      } else {
        playerId = await findOrCreatePlayer(tx.player);
        if (!createdPlayers.has(tx.player.playerMatchKey)) {
          result.playersCreated++;
          createdPlayers.add(tx.player.playerMatchKey);
        }
      }

      // Check for existing acquisition on same date (avoid duplicates)
      const existingAcquisition = await db.playerAcquisition.findFirst({
        where: {
          playerId,
          teamId,
          seasonYear: tx.seasonYear,
          acquisitionType: tx.transactionType,
          acquisitionDate: tx.transactionDate,
        },
      });

      if (existingAcquisition) {
        result.warnings.push(
          `Duplicate transaction skipped: ${tx.player.firstName} ${tx.player.lastName} (${tx.transactionType} on ${tx.transactionDate.toLocaleDateString()})`
        );
        continue;
      }

      // Handle FA signing
      if (tx.transactionType === "FA") {
        await db.playerAcquisition.create({
          data: {
            playerId,
            teamId,
            seasonYear: tx.seasonYear,
            acquisitionType: "FA",
            draftRound: null, // FAs have no draft round
            draftPick: null,
            acquisitionDate: tx.transactionDate,
          },
        });
        result.faSigningsCreated++;
      }

      // Handle trade
      if (tx.transactionType === "TRADE") {
        // For trades, we need to find the original acquisition to get draft info
        // The player retains their original draft round/year
        const originalAcquisition = await db.playerAcquisition.findFirst({
          where: {
            playerId,
            acquisitionType: "DRAFT",
          },
          orderBy: {
            seasonYear: "asc",
          },
        });

        // Find the previous team (most recent acquisition before this trade)
        const previousAcquisition = await db.playerAcquisition.findFirst({
          where: {
            playerId,
            acquisitionDate: {
              lt: tx.transactionDate,
            },
          },
          orderBy: {
            acquisitionDate: "desc",
          },
        });

        await db.playerAcquisition.create({
          data: {
            playerId,
            teamId,
            seasonYear: tx.seasonYear,
            acquisitionType: "TRADE",
            draftRound: originalAcquisition?.draftRound ?? null,
            draftPick: originalAcquisition?.draftPick ?? null,
            acquisitionDate: tx.transactionDate,
            tradedFromTeamId: previousAcquisition?.teamId ?? null,
          },
        });
        result.tradesCreated++;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(
        `Error importing transaction for ${tx.player.firstName} ${tx.player.lastName}: ${message}`
      );
    }
  }

  return result;
}

/**
 * Import only FA signings (most common transaction type)
 */
export async function importFASignings(
  transactions: ParsedTransaction[]
): Promise<TransactionImportResult> {
  const faOnly = transactions.filter((tx) => tx.transactionType === "FA");
  return importTransactions(faOnly);
}

/**
 * Get FA signing count for a player (used in keeper cost calculation)
 */
export async function getPlayerFACount(playerMatchKey: string): Promise<number> {
  const player = await db.player.findUnique({
    where: { playerMatchKey },
    include: {
      acquisitions: {
        where: {
          acquisitionType: "FA",
        },
      },
    },
  });

  return player?.acquisitions.length ?? 0;
}

/**
 * Check if a player was acquired as FA in a given season
 */
export async function wasAcquiredAsFA(
  playerMatchKey: string,
  seasonYear: number
): Promise<boolean> {
  const player = await db.player.findUnique({
    where: { playerMatchKey },
  });

  if (!player) return false;

  const faAcquisition = await db.playerAcquisition.findFirst({
    where: {
      playerId: player.id,
      seasonYear,
      acquisitionType: "FA",
    },
  });

  return !!faAcquisition;
}
