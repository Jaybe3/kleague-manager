import { db } from "@/lib/db";
import type { ParsedTransaction } from "./types";
import { findOrCreatePlayer, getTeamId } from "./draft-importer";
import { isValidTeamName, getSlotIdFromTeamName } from "./team-mapper";

// ============= Transaction Import =============

export interface TransactionImportResult {
  faSigningsCreated: number;
  tradesCreated: number;
  dropsProcessed: number;
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
    dropsProcessed: 0,
    playersCreated: 0,
    errors: [],
    warnings: [],
  };

  // Sort by date ascending (oldest first) so signings happen before drops
  const sortedTransactions = [...transactions].sort(
    (a, b) => a.transactionDate.getTime() - b.transactionDate.getTime()
  );

  // Track created players to count accurately
  const createdPlayers = new Set<string>();

  for (const tx of sortedTransactions) {
    try {
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

      // Handle DROP transactions
      if (tx.transactionType === "DROP") {
        // Get slot ID from team name (works via fallback for retroactive renames)
        const slotId = await getSlotIdFromTeamName(tx.teamName, tx.seasonYear);

        if (!slotId) {
          result.warnings.push(
            `Unknown team for drop: "${tx.teamName}" for ${tx.player.firstName} ${tx.player.lastName}`
          );
          continue;
        }

        // Find the player
        const player = await db.player.findUnique({
          where: { playerMatchKey: tx.player.playerMatchKey },
        });

        if (!player) {
          result.warnings.push(
            `Cannot drop player not in system: ${tx.player.firstName} ${tx.player.lastName}`
          );
          continue;
        }

        // Find their most recent active acquisition on this slot (handles team renames)
        const acquisition = await db.playerAcquisition.findFirst({
          where: {
            playerId: player.id,
            team: { slotId: slotId },
            droppedDate: null,
          },
          orderBy: {
            acquisitionDate: "desc",
          },
        });

        if (!acquisition) {
          result.warnings.push(
            `No active acquisition found for ${tx.player.firstName} ${tx.player.lastName} on slot ${slotId}`
          );
          continue;
        }

        // Update the acquisition with droppedDate
        await db.playerAcquisition.update({
          where: { id: acquisition.id },
          data: { droppedDate: tx.transactionDate },
        });

        result.dropsProcessed++;
        continue;
      }

      // For FA and TRADE, find or create player
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

      // Check for existing acquisition on same calendar date (avoid duplicates)
      // Use date range to handle timezone inconsistencies in CBS date parsing
      const txDateStart = new Date(tx.transactionDate);
      txDateStart.setUTCHours(0, 0, 0, 0);
      const txDateEnd = new Date(tx.transactionDate);
      txDateEnd.setUTCHours(23, 59, 59, 999);

      const existingAcquisition = await db.playerAcquisition.findFirst({
        where: {
          playerId,
          teamId,
          seasonYear: tx.seasonYear,
          acquisitionType: tx.transactionType,
          acquisitionDate: {
            gte: txDateStart,
            lte: txDateEnd,
          },
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
        // Duplicate detection for trades (same as FA - date range matching)
        const existingTrade = await db.playerAcquisition.findFirst({
          where: {
            playerId,
            teamId,
            seasonYear: tx.seasonYear,
            acquisitionType: "TRADE",
            acquisitionDate: {
              gte: txDateStart,
              lte: txDateEnd,
            },
          },
        });

        if (existingTrade) {
          result.warnings.push(
            `Duplicate trade skipped: ${tx.player.firstName} ${tx.player.lastName} (TRADE on ${tx.transactionDate.toLocaleDateString()})`
          );
          continue;
        }

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

        // Find the source team using tradedFromTeam name or fallback to previous acquisition
        let tradedFromTeamId: string | null = null;

        if (tx.tradedFromTeam) {
          // Look up source team by name
          const sourceSlotId = await getSlotIdFromTeamName(tx.tradedFromTeam, tx.seasonYear);
          if (sourceSlotId) {
            const sourceTeam = await db.team.findFirst({
              where: { slotId: sourceSlotId, seasonYear: tx.seasonYear },
            });
            if (sourceTeam) {
              tradedFromTeamId = sourceTeam.id;

              // Set droppedDate on source team's active acquisition
              const sourceAcquisition = await db.playerAcquisition.findFirst({
                where: {
                  playerId,
                  team: { slotId: sourceSlotId },
                  droppedDate: null,
                },
                orderBy: {
                  acquisitionDate: "desc",
                },
              });

              if (sourceAcquisition) {
                await db.playerAcquisition.update({
                  where: { id: sourceAcquisition.id },
                  data: { droppedDate: tx.transactionDate },
                });
              }
            }
          }
        }

        // Fallback: find previous acquisition if tradedFromTeam not provided
        if (!tradedFromTeamId) {
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
          tradedFromTeamId = previousAcquisition?.teamId ?? null;
        }

        await db.playerAcquisition.create({
          data: {
            playerId,
            teamId,
            seasonYear: tx.seasonYear,
            acquisitionType: "TRADE",
            draftRound: originalAcquisition?.draftRound ?? null,
            draftPick: originalAcquisition?.draftPick ?? null,
            acquisitionDate: tx.transactionDate,
            tradedFromTeamId,
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
