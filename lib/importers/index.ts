import type { ImportType, SingleImportResult, TradeEntry } from "./types";
import * as XLSX from "xlsx";
import {
  parseDraftText,
  parseTransactionText,
  getTotalRounds,
} from "./text-parser";
import {
  importDraftPicks,
  findOrCreateSeason,
  findOrCreatePlayer,
  getTeamId,
} from "./draft-importer";
import { importTransactions } from "./transaction-importer";
import { db } from "@/lib/db";
import { isValidTeamName } from "./team-mapper";

export * from "./types";
export * from "./text-parser";
export * from "./team-mapper";
export * from "./draft-importer";
export * from "./transaction-importer";

// ============= Validation Helpers =============

/**
 * Validate that draft order is set for the season.
 * Draft order must be configured before importing draft data,
 * as it's used to resolve unknown team names to slots.
 *
 * @throws Error if draft order is not fully configured (10 slots)
 */
async function validateDraftOrderExists(seasonYear: number): Promise<void> {
  const draftOrders = await db.draftOrder.findMany({
    where: { seasonYear },
  });

  if (draftOrders.length === 0) {
    throw new Error(
      `Draft order not set for ${seasonYear}. ` +
      `Go to Admin > Draft Order and configure the draft order before importing.`
    );
  }

  if (draftOrders.length !== 10) {
    throw new Error(
      `Incomplete draft order for ${seasonYear} (${draftOrders.length}/10 slots configured). ` +
      `Go to Admin > Draft Order and complete the configuration before importing.`
    );
  }
}

// ============= Text Import Functions =============

/**
 * Import draft data from pasted text
 */
export async function importDraftFromText(
  text: string,
  seasonYear: number
): Promise<SingleImportResult> {
  const result: SingleImportResult = {
    success: false,
    importType: "draft",
    seasonYear,
    imported: {
      teams: 0,
      players: 0,
      acquisitions: 0,
    },
    skipped: {
      duplicates: 0,
      invalid: 0,
    },
    errors: [],
    warnings: [],
  };

  try {
    // Validate draft order is set (required for team name → slot resolution)
    await validateDraftOrderExists(seasonYear);

    // Create season if needed
    await findOrCreateSeason(seasonYear);

    // Parse text
    const { picks, errors: parseErrors } = parseDraftText(text, seasonYear);
    result.errors.push(...parseErrors);

    if (picks.length === 0) {
      result.errors.push("No valid draft picks found in the text.");
      return result;
    }

    // Import the draft picks
    const importResult = await importDraftPicks(picks);

    result.imported.teams = importResult.teamsCreated;
    result.imported.players = importResult.playersCreated;
    result.imported.acquisitions = importResult.acquisitionsCreated;
    result.errors.push(...importResult.errors);
    result.warnings.push(...importResult.warnings);

    result.success = result.errors.length === 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.errors.push(`Import failed: ${message}`);
  }

  return result;
}

/**
 * Import FA data from pasted text
 */
export async function importFAFromText(
  text: string,
  seasonYear: number
): Promise<SingleImportResult> {
  const result: SingleImportResult = {
    success: false,
    importType: "fa",
    seasonYear,
    imported: {
      teams: 0,
      players: 0,
      acquisitions: 0,
    },
    skipped: {
      duplicates: 0,
      invalid: 0,
    },
    errors: [],
    warnings: [],
  };

  try {
    // Check that season exists (should import draft first)
    const season = await db.season.findUnique({
      where: { year: seasonYear },
    });

    if (!season) {
      result.errors.push(`Season ${seasonYear} not found. Please import draft data first to create the season and teams.`);
      return result;
    }

    // Parse text
    const { transactions, errors: parseErrors } = parseTransactionText(text, seasonYear);
    result.errors.push(...parseErrors);

    if (transactions.length === 0) {
      result.errors.push("No valid transactions found in the text.");
      return result;
    }

    // Import the transactions (FA signings and drops)
    const importResult = await importTransactions(transactions);

    result.imported.players = importResult.playersCreated;
    result.imported.acquisitions = importResult.faSigningsCreated;
    result.errors.push(...importResult.errors);
    result.warnings.push(...importResult.warnings);

    // Report drops processed
    if (importResult.dropsProcessed > 0) {
      result.warnings.push(`Processed ${importResult.dropsProcessed} drop transactions`);
    }

    result.success = result.errors.length === 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.errors.push(`Import failed: ${message}`);
  }

  return result;
}

// ============= Excel Import Functions =============

/**
 * Read first sheet from Excel buffer (ignores sheet name)
 */
function readFirstSheet(buffer: Buffer): Record<string, unknown>[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("Excel file has no sheets");
  }

  const sheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json(sheet);
}

/**
 * Import draft picks from Excel buffer (reads first sheet)
 */
export async function importDraftData(
  buffer: Buffer,
  seasonYear: number
): Promise<SingleImportResult> {
  const result: SingleImportResult = {
    success: false,
    importType: "draft",
    seasonYear,
    imported: {
      teams: 0,
      players: 0,
      acquisitions: 0,
    },
    skipped: {
      duplicates: 0,
      invalid: 0,
    },
    errors: [],
    warnings: [],
  };

  try {
    // Validate draft order is set (required for team name → slot resolution)
    await validateDraftOrderExists(seasonYear);

    // Create season if needed
    await findOrCreateSeason(seasonYear);

    // Read first sheet from Excel
    const rows = readFirstSheet(buffer);

    if (!rows || rows.length === 0) {
      result.errors.push("No data found in Excel file.");
      return result;
    }

    // Convert rows to draft picks
    // Expected columns: Pick, Team, Player (or similar)
    const picks = [];
    let currentRound = 0;
    let pickInRound = 0;

    for (const row of rows) {
      const rowData = row as Record<string, unknown>;

      // Check for round marker
      const roundStr = String(rowData['Round'] || rowData['round'] || '');
      if (roundStr && !isNaN(parseInt(roundStr, 10))) {
        currentRound = parseInt(roundStr, 10);
        pickInRound = 0;
      }

      // Try to extract pick data
      const teamName = String(rowData['Team'] || rowData['team'] || '').trim();
      const playerStr = String(rowData['Player'] || rowData['player'] || '').trim();

      if (!teamName || !playerStr) continue;

      // Parse player from string like "Patrick Mahomes QB • KC"
      const playerMatch = playerStr.match(/^(.+?)\s+([A-Z]{1,3})\s*•?\s*([A-Z]{2,3})?$/);
      if (!playerMatch) continue;

      const [, fullName, position] = playerMatch;
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      const playerMatchKey = `${firstName}${lastName}`.replace(/[^a-zA-Z]/g, '');

      pickInRound++;
      const overallPick = currentRound > 0 ? (currentRound - 1) * 10 + pickInRound : pickInRound;

      picks.push({
        player: {
          playerMatchKey,
          firstName,
          lastName,
          position: position.toUpperCase(),
        },
        teamName,
        seasonYear,
        draftRound: currentRound || Math.ceil(overallPick / 10),
        draftPick: overallPick,
      });
    }

    if (picks.length === 0) {
      result.errors.push("No valid draft picks found in the Excel file.");
      return result;
    }

    // Import the draft picks
    const importResult = await importDraftPicks(picks);

    result.imported.teams = importResult.teamsCreated;
    result.imported.players = importResult.playersCreated;
    result.imported.acquisitions = importResult.acquisitionsCreated;
    result.errors.push(...importResult.errors);
    result.warnings.push(...importResult.warnings);

    result.success = result.errors.length === 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.errors.push(`Import failed: ${message}`);
  }

  return result;
}

/**
 * Import FA signings from Excel buffer (reads first sheet)
 */
export async function importFAData(
  buffer: Buffer,
  seasonYear: number
): Promise<SingleImportResult> {
  const result: SingleImportResult = {
    success: false,
    importType: "fa",
    seasonYear,
    imported: {
      teams: 0,
      players: 0,
      acquisitions: 0,
    },
    skipped: {
      duplicates: 0,
      invalid: 0,
    },
    errors: [],
    warnings: [],
  };

  try {
    // Check that season exists
    const season = await db.season.findUnique({
      where: { year: seasonYear },
    });

    if (!season) {
      result.errors.push(`Season ${seasonYear} not found. Please import draft data first.`);
      return result;
    }

    // Read first sheet from Excel
    const rows = readFirstSheet(buffer);

    if (!rows || rows.length === 0) {
      result.errors.push("No data found in Excel file.");
      return result;
    }

    // Convert rows to transactions
    const transactions = [];
    let skippedDrops = 0;

    for (const row of rows) {
      const rowData = row as Record<string, unknown>;

      const teamName = String(rowData['Team'] || rowData['team'] || '').trim();
      const playersStr = String(rowData['Players'] || rowData['players'] || rowData['Player'] || '').trim();
      const dateStr = String(rowData['Date'] || rowData['date'] || '').trim();

      if (!teamName || !playersStr) continue;

      // Check if it's a drop
      if (playersStr.toLowerCase().includes('dropped')) {
        skippedDrops++;
        continue;
      }

      // Only process signings
      if (!playersStr.toLowerCase().includes('signed')) continue;

      // Parse player
      const playerMatch = playersStr.match(/^(.+?)\s+([A-Z]{1,3})\s*•?\s*([A-Z]{2,3})?\s*-?\s*Signed/i);
      if (!playerMatch) continue;

      const [, fullName, position] = playerMatch;
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      const playerMatchKey = `${firstName}${lastName}`.replace(/[^a-zA-Z]/g, '');

      // Parse date
      let transactionDate = new Date();
      if (dateStr) {
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          transactionDate = parsed;
        }
      }

      transactions.push({
        player: {
          playerMatchKey,
          firstName,
          lastName,
          position: position.toUpperCase(),
        },
        teamName,
        seasonYear,
        transactionType: 'FA' as const,
        transactionDate,
      });
    }

    if (skippedDrops > 0) {
      result.warnings.push(`Skipped ${skippedDrops} drop transactions`);
    }

    if (transactions.length === 0) {
      result.errors.push("No valid FA signings found in the Excel file.");
      return result;
    }

    // Import the transactions
    const importResult = await importTransactions(transactions);

    result.imported.players = importResult.playersCreated;
    result.imported.acquisitions = importResult.faSigningsCreated;
    result.errors.push(...importResult.errors);
    result.warnings.push(...importResult.warnings);

    result.success = result.errors.length === 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.errors.push(`Import failed: ${message}`);
  }

  return result;
}

// ============= Manual Trade Entry =============

export interface TradeResult {
  success: boolean;
  tradeId?: string;
  error?: string;
}

/**
 * Enter a trade manually
 */
export async function enterTrade(trade: TradeEntry): Promise<TradeResult> {
  try {
    // Validate teams (async)
    const fromValid = await isValidTeamName(trade.fromTeamName);
    if (!fromValid) {
      return { success: false, error: `Unknown team: "${trade.fromTeamName}"` };
    }
    const toValid = await isValidTeamName(trade.toTeamName);
    if (!toValid) {
      return { success: false, error: `Unknown team: "${trade.toTeamName}"` };
    }

    // Get team IDs
    const fromTeamId = await getTeamId(trade.fromTeamName, trade.seasonYear);
    const toTeamId = await getTeamId(trade.toTeamName, trade.seasonYear);

    if (!fromTeamId) {
      return { success: false, error: `Team "${trade.fromTeamName}" not found for season ${trade.seasonYear}` };
    }
    if (!toTeamId) {
      return { success: false, error: `Team "${trade.toTeamName}" not found for season ${trade.seasonYear}` };
    }

    // Find or create player
    const playerId = await findOrCreatePlayer({
      playerMatchKey: trade.playerMatchKey,
      firstName: trade.playerFirstName,
      lastName: trade.playerLastName,
      position: trade.playerPosition,
    });

    // Find original draft acquisition (to preserve draft round)
    const originalAcquisition = await db.playerAcquisition.findFirst({
      where: {
        playerId,
        acquisitionType: "DRAFT",
      },
      orderBy: {
        seasonYear: "asc",
      },
    });

    // Close ALL active acquisitions for this player in this season (any team)
    await db.playerAcquisition.updateMany({
      where: {
        playerId,
        seasonYear: trade.seasonYear,
        droppedDate: null,
      },
      data: {
        droppedDate: trade.tradeDate,
      },
    });

    // Create trade acquisition
    const tradeAcquisition = await db.playerAcquisition.create({
      data: {
        playerId,
        teamId: toTeamId,
        seasonYear: trade.seasonYear,
        acquisitionType: "TRADE",
        draftRound: originalAcquisition?.draftRound ?? null,
        draftPick: originalAcquisition?.draftPick ?? null,
        acquisitionDate: trade.tradeDate,
        tradedFromTeamId: fromTeamId,
      },
    });

    return { success: true, tradeId: tradeAcquisition.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

/**
 * Get all teams for a season (for dropdowns)
 */
export async function getTeamsForSeason(seasonYear: number) {
  return db.team.findMany({
    where: { seasonYear },
    orderBy: { teamName: "asc" },
  });
}

/**
 * Search players by name (for autocomplete)
 */
export async function searchPlayers(query: string, limit = 10) {
  return db.player.findMany({
    where: {
      OR: [
        { firstName: { contains: query } },
        { lastName: { contains: query } },
        { playerMatchKey: { contains: query } },
      ],
    },
    take: limit,
    orderBy: { lastName: "asc" },
  });
}
