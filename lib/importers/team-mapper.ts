import type { TeamMapping } from "./types";

/**
 * Team mappings with permanentId (1-10)
 * permanentId stays constant even if team names change year-to-year
 * aliases handle variations in spacing, capitalization, etc.
 */
const TEAM_MAPPINGS: TeamMapping[] = [
  {
    permanentId: 1,
    canonicalName: "Gatordontplay",
    aliases: ["gatordontplay", "gatordontplay "],
  },
  {
    permanentId: 2,
    canonicalName: "Team 4",
    aliases: ["team 4"],
  },
  {
    permanentId: 3,
    canonicalName: "Go Go Garrett",
    aliases: ["go go garrett"],
  },
  {
    permanentId: 4,
    canonicalName: "The Bushwhackers",
    aliases: ["the bushwhackers"],
  },
  {
    permanentId: 5,
    canonicalName: "Fields of Dreams",
    aliases: ["fields of dreams"],
  },
  {
    permanentId: 6,
    canonicalName: "Let Bijans be Bijans",
    aliases: ["let bijans be bijans", "let bijans be bijans "],
  },
  {
    permanentId: 7,
    canonicalName: "Box of Rocks",
    aliases: ["box of rocks"],
  },
  {
    permanentId: 8,
    canonicalName: "Woody and the Jets!",
    aliases: ["woody and the jets!", "woody and the jets"],
  },
  {
    permanentId: 9,
    canonicalName: "Discount Belichick",
    aliases: ["discount belichick"],
  },
  {
    permanentId: 10,
    canonicalName: "Sweet Chin Music",
    aliases: ["sweet chin music"],
  },
];

/**
 * Normalize team name for matching
 * - Trim whitespace
 * - Convert to lowercase
 */
export function normalizeTeamName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Get permanentId for a team name
 * @throws Error if team not found
 */
export function getTeamPermanentId(teamName: string): number {
  const normalized = normalizeTeamName(teamName);

  for (const mapping of TEAM_MAPPINGS) {
    if (
      normalizeTeamName(mapping.canonicalName) === normalized ||
      mapping.aliases.includes(normalized)
    ) {
      return mapping.permanentId;
    }
  }

  throw new Error(`Unknown team name: "${teamName}" (normalized: "${normalized}")`);
}

/**
 * Get canonical team name from any variation
 */
export function getCanonicalTeamName(teamName: string): string {
  const normalized = normalizeTeamName(teamName);

  for (const mapping of TEAM_MAPPINGS) {
    if (
      normalizeTeamName(mapping.canonicalName) === normalized ||
      mapping.aliases.includes(normalized)
    ) {
      return mapping.canonicalName;
    }
  }

  throw new Error(`Unknown team name: "${teamName}"`);
}

/**
 * Get team mapping by permanentId
 */
export function getTeamByPermanentId(permanentId: number): TeamMapping | undefined {
  return TEAM_MAPPINGS.find((m) => m.permanentId === permanentId);
}

/**
 * Get all team mappings
 */
export function getAllTeamMappings(): TeamMapping[] {
  return [...TEAM_MAPPINGS];
}

/**
 * Check if a team name is valid/known
 */
export function isValidTeamName(teamName: string): boolean {
  try {
    getTeamPermanentId(teamName);
    return true;
  } catch {
    return false;
  }
}

/**
 * Add a new alias for an existing team
 * Used when discovering new name variations during import
 */
export function addTeamAlias(permanentId: number, alias: string): void {
  const mapping = TEAM_MAPPINGS.find((m) => m.permanentId === permanentId);
  if (!mapping) {
    throw new Error(`No team with permanentId: ${permanentId}`);
  }

  const normalized = normalizeTeamName(alias);
  if (!mapping.aliases.includes(normalized)) {
    mapping.aliases.push(normalized);
  }
}
