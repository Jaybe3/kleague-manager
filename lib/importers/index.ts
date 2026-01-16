import type { ImportType, SingleImportResult, TradeEntry } from "./types";
import {
  readExcelBuffer,
  parseAllDraftPicks,
  parseAllTransactions,
} from "./excel-parser";
import {
  importDraftPicks,
  findOrCreateSeason,
  findOrCreatePlayer,
  getTeamId,
} from "./draft-importer";
import { importTransactions } from "./transaction-importer";
import { db } from "@/lib/db";
import { getTeamPermanentId, isValidTeamName } from "./team-mapper";

export * from "./types";
export * from "./excel-parser";
export * from "./team-mapper";
export * from "./draft-importer";
export * from "./transaction-importer";

// ============= Single Import Functions =============

/**
 * Import draft picks only for a specific year
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
    // Create season if needed
    await findOrCreateSeason(seasonYear);

    // Read Excel and parse draft sheet
    const workbook = readExcelBuffer(buffer);

    // Try to find a draft sheet - look for common patterns
    const draftSheet = workbook.draft2024; // This reads "2024_Draft_team"

    if (!draftSheet || draftSheet.length === 0) {
      result.errors.push("No draft data found in Excel file. Expected sheet named '2024_Draft_team' or similar.");
      return result;
    }

    // Parse draft picks with the user-specified year
    const { picks, skipped } = parseAllDraftPicks(draftSheet, seasonYear);
    result.skipped.invalid = skipped;

    if (picks.length === 0) {
      result.errors.push("No valid draft picks found in the file.");
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
 * Import FA signings only for a specific year
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
    // Check that season exists (should import draft first)
    const season = await db.season.findUnique({
      where: { year: seasonYear },
    });

    if (!season) {
      result.errors.push(`Season ${seasonYear} not found. Please import draft data first to create the season and teams.`);
      return result;
    }

    // Read Excel and parse transactions sheet
    const workbook = readExcelBuffer(buffer);
    const txSheet = workbook.transactions2024;

    if (!txSheet || txSheet.length === 0) {
      result.errors.push("No transaction data found in Excel file. Expected sheet named '2024_Transactions' or similar.");
      return result;
    }

    // Parse transactions with the user-specified year
    const { transactions, skippedDrops, skippedInvalid } = parseAllTransactions(
      txSheet,
      seasonYear
    );
    result.skipped.invalid = skippedInvalid;
    // Drops are expected to be skipped, add as info
    if (skippedDrops > 0) {
      result.warnings.push(`Skipped ${skippedDrops} drop transactions (only FA signings are imported)`);
    }

    if (transactions.length === 0) {
      result.errors.push("No valid FA signings found in the file.");
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
    // Validate teams
    if (!isValidTeamName(trade.fromTeamName)) {
      return { success: false, error: `Unknown team: "${trade.fromTeamName}"` };
    }
    if (!isValidTeamName(trade.toTeamName)) {
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
