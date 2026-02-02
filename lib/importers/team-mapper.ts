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

/**
 * Resolve team name to slot, auto-creating alias if needed.
 * Uses draft position to find the correct slot when team name is unknown.
 *
 * @param teamName - Team name from import data
 * @param draftPosition - First round draft pick position (1-10)
 * @param seasonYear - Season year being imported
 * @returns slotId if resolved, null if cannot resolve
 */
export async function resolveTeamSlotWithAutoAlias(
  teamName: string,
  draftPosition: number,
  seasonYear: number
): Promise<{ slotId: number; created: boolean } | null> {
  // First, try normal lookup
  const existingSlotId = await getSlotIdFromTeamName(teamName, seasonYear)
  if (existingSlotId) {
    return { slotId: existingSlotId, created: false }
  }

  // Team name not found - try to resolve via draft position
  // Draft position in round 1 determines which slot this team is
  const draftOrder = await db.draftOrder.findFirst({
    where: {
      seasonYear,
      position: draftPosition,
    },
  })

  if (!draftOrder) {
    // Can't resolve - draft order not set or invalid position
    return null
  }

  const slotId = draftOrder.slotId

  // Auto-create alias for this team name
  // Use validFrom = seasonYear, validTo = null (current name for this slot)
  const normalized = normalizeTeamName(teamName)

  // Check if this exact alias already exists (case insensitive)
  const existingAlias = await db.teamAlias.findFirst({
    where: {
      slotId,
      teamName: {
        equals: normalized,
        mode: 'insensitive',
      },
    },
  })

  if (!existingAlias) {
    // Close out previous current name for this slot
    await db.teamAlias.updateMany({
      where: {
        slotId,
        validTo: null,
      },
      data: {
        validTo: seasonYear - 1,
      },
    })

    // Create new alias as current name
    await db.teamAlias.create({
      data: {
        slotId,
        teamName: teamName.trim(), // Preserve original casing
        validFrom: seasonYear,
        validTo: null,
      },
    })

    return { slotId, created: true }
  }

  return { slotId, created: false }
}
