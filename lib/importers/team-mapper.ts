import { db } from '@/lib/db'

/**
 * Normalize team name for matching
 * - Trim whitespace
 * - Convert to lowercase
 */
export function normalizeTeamName(name: string): string {
  return name.trim().toLowerCase()
}

/**
 * Get slot ID for a team name in a specific season year
 * Handles CBS retroactive renames by checking year ranges
 *
 * @param teamName - The team name from CBS data
 * @param seasonYear - The season year being imported
 * @returns Slot ID (1-10) or null if not found
 */
export async function getSlotIdFromTeamName(
  teamName: string,
  seasonYear: number
): Promise<number | null> {
  const normalized = normalizeTeamName(teamName)

  // Query aliases where name matches and year is in valid range
  const alias = await db.teamAlias.findFirst({
    where: {
      teamName: {
        equals: normalized,
        mode: 'insensitive',
      },
      validFrom: { lte: seasonYear },
      OR: [
        { validTo: null },
        { validTo: { gte: seasonYear } },
      ],
    },
  })

  if (alias) {
    return alias.slotId
  }

  // Fallback: try exact match on any alias (handles CBS retroactive renames)
  // e.g., CBS shows "Seal Team Nix" for 2023 data even though team was "Discount Belichick" then
  const anyAlias = await db.teamAlias.findFirst({
    where: {
      teamName: {
        equals: normalized,
        mode: 'insensitive',
      },
    },
  })

  return anyAlias?.slotId ?? null
}

/**
 * Get slot ID - throws if not found
 * @throws Error if team not found
 */
export async function getSlotIdOrThrow(
  teamName: string,
  seasonYear: number
): Promise<number> {
  const slotId = await getSlotIdFromTeamName(teamName, seasonYear)

  if (slotId === null) {
    throw new Error(
      `Unknown team name: "${teamName}" for season ${seasonYear}. ` +
      `Add this team to the TeamAlias table via Admin > Teams.`
    )
  }

  return slotId
}

/**
 * Get all known team names for a slot
 */
export async function getSlotAliases(slotId: number): Promise<string[]> {
  const aliases = await db.teamAlias.findMany({
    where: { slotId },
    select: { teamName: true },
  })

  return aliases.map(a => a.teamName)
}

/**
 * Get current team name for a slot (validTo is null)
 */
export async function getCurrentTeamName(slotId: number): Promise<string | null> {
  const alias = await db.teamAlias.findFirst({
    where: {
      slotId,
      validTo: null,
    },
    select: { teamName: true },
  })

  return alias?.teamName ?? null
}

/**
 * Get all slots with their current names
 */
export async function getAllSlots(): Promise<{ slotId: number; currentName: string }[]> {
  const slots = await db.teamSlot.findMany({
    include: {
      aliases: {
        where: { validTo: null },
        take: 1,
      },
    },
    orderBy: { id: 'asc' },
  })

  return slots.map(slot => ({
    slotId: slot.id,
    currentName: slot.aliases[0]?.teamName ?? `Slot ${slot.id}`,
  }))
}

/**
 * Check if a team name is valid/known for any year
 */
export async function isValidTeamName(teamName: string): Promise<boolean> {
  const normalized = normalizeTeamName(teamName)

  const alias = await db.teamAlias.findFirst({
    where: {
      teamName: {
        equals: normalized,
        mode: 'insensitive',
      },
    },
  })

  return alias !== null
}

/**
 * Add a new alias for a slot
 * Used when commissioner adds new team name
 */
export async function addTeamAlias(
  slotId: number,
  teamName: string,
  validFrom: number,
  validTo: number | null = null
): Promise<void> {
  // If adding a new current name, close out the previous current name
  if (validTo === null) {
    await db.teamAlias.updateMany({
      where: {
        slotId,
        validTo: null,
      },
      data: {
        validTo: validFrom - 1,
      },
    })
  }

  await db.teamAlias.create({
    data: {
      slotId,
      teamName,
      validFrom,
      validTo,
    },
  })
}
