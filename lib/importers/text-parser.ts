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
 * Strip emoji characters that can appear in CBS data
 * Removes common emojis like 🔒 ⬛ that break regex matching
 */
export function stripEmojis(str: string): string {
  return str
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Misc symbols, emoticons
    .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Misc symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
    .replace(/[\u{25A0}-\u{25FF}]/gu, '')   // Geometric shapes (⬛)
    .replace(/[\u{1F100}-\u{1F1FF}]/gu, '') // Enclosed alphanumerics
    .trim()
}

/**
 * Parse player string from CBS format
 * Example: "Patrick Mahomes QB • KC" or "Jonathan Owens DB • CHI - Signed for $0"
 * Also handles keeper suffix: "Patrick Mahomes QB • KC (Keeper)"
 */
export function parsePlayerString(playerStr: string): ParsedPlayer | null {
  if (!playerStr || playerStr.trim() === '') return null

  // Remove any action suffix like "- Signed for $0" or "- Dropped"
  let cleanedStr = playerStr.split(' - ')[0].trim()

  // Remove "(Keeper)" suffix if present
  cleanedStr = cleanedStr.replace(/\s*\(Keeper\)\s*$/i, '').trim()

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
 * Parsed player with their transaction action
 */
export interface ParsedPlayerAction {
  player: ParsedPlayer
  action: 'FA' | 'DROP' | 'TRADE'
  tradedFromTeam?: string // Source team name for TRADE actions
}

/**
 * Parse the "Players" column from CBS which may contain multiple players
 *
 * CBS combines signing + drop in single rows like:
 * "Dillon Gabriel QB • CLE - Signed for $0.00 Cooper Kupp WR • SEA - Dropped"
 *
 * CBS trade format:
 * "Jordan Love QB • GB - Traded from Nabers Think I'm Selling Dope"
 *
 * Each player follows format: [Name] [Position] • [Team] - [Action]
 * Where [Action] is "Signed for $X.XX", "Dropped", or "Traded from [Team]"
 */
export function parsePlayersColumn(playersStr: string): ParsedPlayerAction[] {
  if (!playersStr || playersStr.trim() === '') return []

  // Strip emojis that can appear in CBS data
  const cleaned = stripEmojis(playersStr)

  // Regex to match each player entry:
  // - Name (one or more words, can include Jr., III, O'Brien, etc.)
  // - Position (1-3 uppercase letters)
  // - Bullet (•)
  // - NFL Team (2-3 uppercase letters, optional - may be missing for free agents)
  // - Dash and action (Signed for $X.XX, Dropped, or Traded from [Team])
  // Lookahead handles multi-word names like "Cooper Kupp" (FirstName LastName Position)
  const playerRegex = /([A-Za-z][A-Za-z'.\-]+(?:\s+[A-Za-z'.\-]+)*)\s+([A-Z]{1,3})\s*•\s*([A-Z]{2,3})?\s*-\s*(Signed\s+for\s+\$[\d.]+|Dropped|Traded\s+from\s+[^$]+?)(?=\s+[A-Z][a-z]+(?:\s+[A-Z][a-z'.\-]+)*\s+[A-Z]{1,3}\s*•|$)/gi

  const results: ParsedPlayerAction[] = []
  let match

  while ((match = playerRegex.exec(cleaned)) !== null) {
    const [, fullName, position, , actionStr] = match
    const nameParts = fullName.trim().split(/\s+/)
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''
    const playerMatchKey = `${firstName}${lastName}`.replace(/[^a-zA-Z]/g, '')

    let action: 'FA' | 'DROP' | 'TRADE'
    let tradedFromTeam: string | undefined

    const actionLower = actionStr.toLowerCase()
    if (actionLower.includes('signed')) {
      action = 'FA'
    } else if (actionLower.includes('traded from')) {
      action = 'TRADE'
      // Extract team name from "Traded from [Team Name]"
      const tradeMatch = actionStr.match(/traded\s+from\s+(.+)/i)
      if (tradeMatch) {
        tradedFromTeam = tradeMatch[1].trim()
      }
    } else {
      action = 'DROP'
    }

    const result: ParsedPlayerAction = {
      player: {
        playerMatchKey,
        firstName,
        lastName,
        position: position.toUpperCase(),
      },
      action,
    }

    if (tradedFromTeam) {
      result.tradedFromTeam = tradedFromTeam
    }

    results.push(result)
  }

  return results
}

/**
 * Parse FA transaction text from CBS copy/paste
 *
 * Format:
 * Date	Team	Players	Effective
 * 12/30/23 1:42 AM ET	Sweet Chin Music	Jonathan Owens DB • CHI - Signed for $0	17
 * 12/30/23 12:38 AM ET	Team 4	Mike Williams WR • NYJ - Dropped	17
 *
 * CBS may combine multiple players in one row:
 * "Dillon Gabriel QB • CLE - Signed for $0.00 Cooper Kupp WR • SEA - Dropped"
 */
export function parseTransactionText(text: string, seasonYear: number): {
  transactions: ParsedTransaction[]
  errors: string[]
} {
  const transactions: ParsedTransaction[] = []
  const errors: string[] = []

  // Preprocess: join continuation lines (lines without dates) to previous line
  // CBS splits multi-player transactions across multiple lines
  const rawLines = text.split('\n')
  const joinedLines: string[] = []

  for (const line of rawLines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Check if line starts with a date pattern (M/D/YY or MM/DD/YY)
    const startsWithDate = /^\d{1,2}\/\d{1,2}\/\d{2}/.test(trimmed)

    if (startsWithDate || joinedLines.length === 0) {
      joinedLines.push(trimmed)
    } else {
      // Continuation line - append to previous
      joinedLines[joinedLines.length - 1] += ' ' + trimmed
    }
  }

  const lines = joinedLines

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

    // Skip non-transaction rows (activations, deactivations, etc.)
    // Check the whole string first before parsing individual players
    const hasTransaction = playersStr.toLowerCase().includes('signed') ||
                           playersStr.toLowerCase().includes('dropped') ||
                           playersStr.toLowerCase().includes('traded')
    if (!hasTransaction) {
      continue
    }

    // Parse all players from the column (CBS may combine multiple in one row)
    const playerActions = parsePlayersColumn(playersStr)

    if (playerActions.length === 0) {
      errors.push(`Could not parse players: "${playersStr}"`)
      continue
    }

    // Create a transaction for each player found
    for (const { player, action, tradedFromTeam } of playerActions) {
      const transaction: ParsedTransaction = {
        player,
        teamName: teamName.trim(),
        seasonYear,
        transactionType: action,
        transactionDate,
      }

      if (tradedFromTeam) {
        transaction.tradedFromTeam = tradedFromTeam
      }

      transactions.push(transaction)
    }
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
