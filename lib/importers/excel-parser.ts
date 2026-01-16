import * as XLSX from "xlsx";
import type {
  DraftSheetRow,
  TransactionSheetRow,
  RosterSheetRow,
  DraftOrderRow,
  ParsedPlayer,
  ParsedDraftPick,
  ParsedTransaction,
  ParsedKeeperSlot,
} from "./types";

// ============= Sheet Names =============

const SHEET_NAMES = {
  DRAFT_2024: "2024_Draft_team",
  DRAFT_2025: "2025_Draft_team",
  ROSTER_2024: "2024_Roster_Offseason",
  TRANSACTIONS_2024: "2024_Transactions",
} as const;

// ============= Excel File Reader =============

export interface ExcelWorkbook {
  draft2024: DraftSheetRow[];
  draft2025: DraftOrderRow[];
  roster2024: RosterSheetRow[];
  transactions2024: TransactionSheetRow[];
}

/**
 * Read Excel file and return typed sheet data
 */
export function readExcelFile(filePath: string): ExcelWorkbook {
  const workbook = XLSX.readFile(filePath);

  return {
    draft2024: readSheet<DraftSheetRow>(workbook, SHEET_NAMES.DRAFT_2024),
    draft2025: readSheet<DraftOrderRow>(workbook, SHEET_NAMES.DRAFT_2025),
    roster2024: readSheet<RosterSheetRow>(workbook, SHEET_NAMES.ROSTER_2024),
    transactions2024: readSheet<TransactionSheetRow>(workbook, SHEET_NAMES.TRANSACTIONS_2024),
  };
}

/**
 * Read Excel file from buffer (for API uploads)
 */
export function readExcelBuffer(buffer: Buffer): ExcelWorkbook {
  const workbook = XLSX.read(buffer, { type: "buffer" });

  return {
    draft2024: readSheet<DraftSheetRow>(workbook, SHEET_NAMES.DRAFT_2024),
    draft2025: readSheet<DraftOrderRow>(workbook, SHEET_NAMES.DRAFT_2025),
    roster2024: readSheet<RosterSheetRow>(workbook, SHEET_NAMES.ROSTER_2024),
    transactions2024: readSheet<TransactionSheetRow>(workbook, SHEET_NAMES.TRANSACTIONS_2024),
  };
}

function readSheet<T>(workbook: XLSX.WorkBook, sheetName: string): T[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Sheet not found: ${sheetName}`);
  }
  return XLSX.utils.sheet_to_json<T>(sheet);
}

// ============= Parsing Utilities =============

/**
 * Parse "Rnd/Pk" format (e.g., " 1/1" or "10/5")
 */
export function parseRoundPick(rndPk: string): { round: number; pick: number } | null {
  if (!rndPk) return null;

  const cleaned = rndPk.trim();
  const match = cleaned.match(/^(\d+)\/(\d+)$/);

  if (!match) {
    return null;
  }

  return {
    round: parseInt(match[1], 10),
    pick: parseInt(match[2], 10),
  };
}

/**
 * Parse transaction date (e.g., "  12/29/24 12:38 PM ET")
 */
export function parseTransactionDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  const cleaned = dateStr.trim();
  // Format: "12/29/24 12:38 PM ET"
  const match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})\s+(\d{1,2}):(\d{2})\s+(AM|PM)\s+ET$/);

  if (!match) {
    // Try simpler format without time
    const simpleMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
    if (simpleMatch) {
      const [, month, day, year] = simpleMatch;
      return new Date(2000 + parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    }
    return null;
  }

  const [, month, day, year, hour, minute, ampm] = match;
  let hours = parseInt(hour, 10);
  if (ampm === "PM" && hours !== 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;

  return new Date(
    2000 + parseInt(year, 10),
    parseInt(month, 10) - 1,
    parseInt(day, 10),
    hours,
    parseInt(minute, 10)
  );
}

/**
 * Parse round string to number (handles "N/A" and empty values)
 */
export function parseRoundNumber(value: string | number | undefined): number | null {
  if (value === undefined || value === null || value === "" || value === "N/A" || value === "#N/A") {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Normalize position string
 */
export function normalizePosition(pos: string): string {
  if (!pos) return "UNKNOWN";
  return pos.trim().toUpperCase();
}

// ============= Data Parsers =============

/**
 * Parse a draft sheet row into a ParsedDraftPick
 */
export function parseDraftRow(row: DraftSheetRow, seasonYear: number): ParsedDraftPick | null {
  // Skip rows without valid PlayerMatch
  if (!row.PlayerMatch || row.PlayerMatch === "#N/A") {
    return null;
  }

  const rndPk = parseRoundPick(row["Rnd/Pk"]);
  if (!rndPk) {
    return null;
  }

  const player: ParsedPlayer = {
    playerMatchKey: row.PlayerMatch,
    firstName: row.First?.trim() || "",
    lastName: row.Last?.trim() || "",
    position: normalizePosition(row.Position),
  };

  return {
    player,
    teamName: row.Team?.trim() || "",
    seasonYear,
    draftRound: rndPk.round,
    draftPick: rndPk.pick,
    wasKeptIn2024: row.Keeper === true,
    round2024: parseRoundNumber(row["2024Round"]),
    round2025: parseRoundNumber(row["2025Round"]),
    isDropped: row.Dropped === true,
  };
}

/**
 * Parse a transaction sheet row into a ParsedTransaction
 */
export function parseTransactionRow(
  row: TransactionSheetRow,
  seasonYear: number
): ParsedTransaction | null {
  // Skip rows without valid PlayerMatch
  if (!row.PlayerMatch || row.PlayerMatch === "#N/A") {
    return null;
  }

  // Skip dropped players (we only care about acquisitions)
  if (row.Type === "Dropped") {
    return null;
  }

  const transactionDate = parseTransactionDate(row.Date);
  if (!transactionDate) {
    return null;
  }

  const player: ParsedPlayer = {
    playerMatchKey: row.PlayerMatch,
    firstName: row.First?.trim() || "",
    lastName: row.Last?.trim() || "",
    position: normalizePosition(row.Position),
  };

  let transactionType: "FA" | "TRADE" | "DROP";
  switch (row.Type) {
    case "Signed":
      transactionType = "FA";
      break;
    case "Traded":
      transactionType = "TRADE";
      break;
    default:
      transactionType = "DROP";
  }

  return {
    player,
    teamName: row.Team?.trim() || "",
    seasonYear,
    transactionType,
    transactionDate,
  };
}

/**
 * Parse 2025 draft order row (keeper slots)
 */
export function parseKeeperSlot(row: DraftOrderRow): ParsedKeeperSlot | null {
  // Skip rows without valid PlayerMatch (empty slots)
  if (!row.PlayerMatch || row.PlayerMatch === "#N/A") {
    return null;
  }

  return {
    playerMatchKey: row.PlayerMatch,
    teamName: row.Team?.trim() || "",
    round: row.Round,
    pick: row.Pick,
  };
}

// ============= Batch Parsers =============

/**
 * Parse all draft picks from a sheet
 */
export function parseAllDraftPicks(rows: DraftSheetRow[], seasonYear: number): {
  picks: ParsedDraftPick[];
  skipped: number;
} {
  const picks: ParsedDraftPick[] = [];
  let skipped = 0;

  for (const row of rows) {
    const parsed = parseDraftRow(row, seasonYear);
    if (parsed) {
      picks.push(parsed);
    } else {
      skipped++;
    }
  }

  return { picks, skipped };
}

/**
 * Parse all transactions from a sheet
 */
export function parseAllTransactions(rows: TransactionSheetRow[], seasonYear: number): {
  transactions: ParsedTransaction[];
  skippedDrops: number;
  skippedInvalid: number;
} {
  const transactions: ParsedTransaction[] = [];
  let skippedDrops = 0;
  let skippedInvalid = 0;

  for (const row of rows) {
    if (row.Type === "Dropped") {
      skippedDrops++;
      continue;
    }

    const parsed = parseTransactionRow(row, seasonYear);
    if (parsed) {
      transactions.push(parsed);
    } else {
      skippedInvalid++;
    }
  }

  return { transactions, skippedDrops, skippedInvalid };
}

/**
 * Parse all keeper slots from 2025 draft order
 */
export function parseAllKeeperSlots(rows: DraftOrderRow[]): {
  slots: ParsedKeeperSlot[];
  emptySlots: number;
} {
  const slots: ParsedKeeperSlot[] = [];
  let emptySlots = 0;

  for (const row of rows) {
    const parsed = parseKeeperSlot(row);
    if (parsed) {
      slots.push(parsed);
    } else {
      emptySlots++;
    }
  }

  return { slots, emptySlots };
}
