/**
 * Text Parser for CBS Sports copy/paste data
 * Handles draft picks and FA transaction formats
 */

import type { ParsedPlayer, ParsedDraftPick, ParsedTransaction } from './types'

// ============= Helper Functions =============

/**
 * Get total rounds for a season year
 * 2023-2024: 27 rounds, 2025+: 28 rounds
 */
export function getTotalRounds(year: number): number {
  return year <= 2024 ? 27 : 28
}

/**
 * Parse player string from CBS format
 * Example: "Patrick Mahomes QB • KC" or "Jonathan Owens DB • CHI - Signed for $0"
 */
export function parsePlayerString(playerStr: string): ParsedPlayer | null {
  if (!playerStr || playerStr.trim() === '') return null

  // Remove any action suffix like "- Signed for $0" or "- Dropped"
  const cleanedStr = playerStr.split(' - ')[0].trim()

  // Match pattern: "FirstName LastName POSITION • TEAM"
  // Position is typically 1-3 uppercase letters
  // The bullet (•) separates position from NFL team
  const match = cleanedStr.match(/^(.+?)\s+([A-Z]{1,3})\s*•\s*([A-Z]{2,3})$/)

  if (match) {
    const [, fullName, position] = match
    const nameParts = fullName.trim().split(/\s+/)
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''
    const playerMatchKey = `${firstName}${lastName}`.replace(/[^a-zA-Z]/g, '')

    return {
      playerMatchKey,
      firstName,
      lastName,
      position: position.toUpperCase(),
    }
  }

  // Try pattern for retired players with bullet but no team: "Name POSITION •"
  const retiredMatch = cleanedStr.match(/^(.+?)\s+([A-Z]{1,3})\s*•\s*$/)
  if (retiredMatch) {
    const [, fullName, position] = retiredMatch
    const nameParts = fullName.trim().split(/\s+/)
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''
    const playerMatchKey = `${firstName}${lastName}`.replace(/[^a-zA-Z]/g, '')

    return {
      playerMatchKey,
      firstName,
      lastName,
      position: position.toUpperCase(),
    }
  }

  // Try without NFL team or bullet (some formats may not include it)
  const simpleMatch = cleanedStr.match(/^(.+?)\s+([A-Z]{1,3})$/)
  if (simpleMatch) {
    const [, fullName, position] = simpleMatch
    const nameParts = fullName.trim().split(/\s+/)
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''
    const playerMatchKey = `${firstName}${lastName}`.replace(/[^a-zA-Z]/g, '')

    return {
      playerMatchKey,
      firstName,
      lastName,
      position: position.toUpperCase(),
    }
  }

  return null
}

// ============= Draft Text Parser =============

/**
 * Parse draft text from CBS copy/paste
 *
 * Format:
 * Round 1
 * Pick	Team	Player	Elig	Elapsed Time	Total Fpts	Active Fpts
 * 1	Go Go Garrett	Patrick Mahomes QB • KC 			826.0	652.0
 * ...
 * Round 2
 * ...
 */
export function parseDraftText(text: string, seasonYear: number): {
  picks: ParsedDraftPick[]
  errors: string[]
} {
  const picks: ParsedDraftPick[] = []
  const errors: string[] = []

  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)

  let currentRound = 0
  let pickInRound = 0

  for (const line of lines) {
    // Check for "Round X" header
    const roundMatch = line.match(/^Round\s+(\d+)$/i)
    if (roundMatch) {
      currentRound = parseInt(roundMatch[1], 10)
      pickInRound = 0
      continue
    }

    // Skip header rows
    if (line.startsWith('Pick') && line.includes('Team') && line.includes('Player')) {
      continue
    }

    // Skip empty or non-data lines
    if (currentRound === 0) continue

    // Parse pick row (tab-separated)
    const parts = line.split('\t')
    if (parts.length < 3) continue

    const [pickStr, teamName, playerStr] = parts

    // Parse pick number
    const pickNum = parseInt(pickStr, 10)
    if (isNaN(pickNum)) continue

    // Parse player
    const player = parsePlayerString(playerStr)
    if (!player) {
      errors.push(`Could not parse player: "${playerStr}" (Round ${currentRound}, Pick ${pickNum})`)
      continue
    }

    // Calculate overall pick number
    pickInRound++
    const overallPick = (currentRound - 1) * 10 + pickInRound

    picks.push({
      player,
      teamName: teamName.trim(),
      seasonYear,
      draftRound: currentRound,
      draftPick: overallPick,
    })
  }

  return { picks, errors }
}

// ============= FA Transaction Text Parser =============

/**
 * Parse FA transaction date from CBS format
 * Example: "12/30/23 1:42 AM ET" or "9/5/24 10:15 PM ET"
 */
export function parseTransactionDateString(dateStr: string): Date | null {
  if (!dateStr) return null

  const cleaned = dateStr.trim()

  // Format: "M/D/YY H:MM AM/PM ET"
  const match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})\s+(\d{1,2}):(\d{2})\s+(AM|PM)\s+ET$/i)

  if (!match) {
    // Try simpler format without time
    const simpleMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/)
    if (simpleMatch) {
      const [, month, day, year] = simpleMatch
      return new Date(2000 + parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10))
    }
    return null
  }

  const [, month, day, year, hour, minute, ampm] = match
  let hours = parseInt(hour, 10)
  if (ampm.toUpperCase() === 'PM' && hours !== 12) hours += 12
  if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0

  return new Date(
    2000 + parseInt(year, 10),
    parseInt(month, 10) - 1,
    parseInt(day, 10),
    hours,
    parseInt(minute, 10)
  )
}

/**
 * Parse transaction action to determine type
 * Returns: 'FA' for signings, 'DROP' for drops, null for others
 */
export function parseTransactionAction(actionStr: string): 'FA' | 'DROP' | null {
  if (!actionStr) return null

  const lower = actionStr.toLowerCase()
  if (lower.includes('signed')) return 'FA'
  if (lower.includes('dropped')) return 'DROP'
  if (lower.includes('traded')) return null // Skip trades, handled separately
  if (lower.includes('activated')) return null // Skip activations
  if (lower.includes('deactivated')) return null

  return null
}

/**
 * Parse FA transaction text from CBS copy/paste
 *
 * Format:
 * Date	Team	Players	Effective
 * 12/30/23 1:42 AM ET	Sweet Chin Music	Jonathan Owens DB • CHI - Signed for $0	17
 * 12/30/23 12:38 AM ET	Team 4	Mike Williams WR • NYJ - Dropped	17
 */
export function parseTransactionText(text: string, seasonYear: number): {
  transactions: ParsedTransaction[]
  errors: string[]
} {
  const transactions: ParsedTransaction[] = []
  const errors: string[] = []

  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)

  for (const line of lines) {
    // Skip header row
    if (line.startsWith('Date') && line.includes('Team') && line.includes('Players')) {
      continue
    }

    // Parse transaction row (tab-separated)
    const parts = line.split('\t')
    if (parts.length < 3) continue

    const [dateStr, teamName, playersStr] = parts

    // Parse date
    const transactionDate = parseTransactionDateString(dateStr)
    if (!transactionDate) {
      // Not a valid transaction line, skip silently
      continue
    }

    // Determine transaction type from action
    const transactionType = parseTransactionAction(playersStr)

    if (transactionType === null) {
      // Skip non-FA/DROP transactions (trades, activations, etc.)
      continue
    }

    // Parse player
    const player = parsePlayerString(playersStr)
    if (!player) {
      errors.push(`Could not parse player: "${playersStr}"`)
      continue
    }

    if (transactionType === 'DROP') {
      transactions.push({
        player,
        teamName: teamName.trim(),
        seasonYear,
        transactionType: 'DROP',
        transactionDate,
      })
      continue
    }

    transactions.push({
      player,
      teamName: teamName.trim(),
      seasonYear,
      transactionType: 'FA',
      transactionDate,
    })
  }

  return { transactions, errors }
}

// ============= Auto-detect Format =============

/**
 * Detect if text is draft data or FA transaction data
 */
export function detectTextFormat(text: string): 'draft' | 'fa' | 'unknown' {
  const lower = text.toLowerCase()

  // Draft format indicators
  if (lower.includes('round 1') || lower.includes('round 2')) {
    return 'draft'
  }

  // FA format indicators
  if (lower.includes('signed for') || lower.includes('dropped')) {
    return 'fa'
  }

  // Check for typical column headers
  if (lower.includes('elapsed time') || lower.includes('total fpts')) {
    return 'draft'
  }

  if (lower.includes('effective') && lower.includes('players')) {
    return 'fa'
  }

  return 'unknown'
}
