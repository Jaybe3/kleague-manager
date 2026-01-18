import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

/**
 * Get slot ID for a team name in a specific season year
 */
async function getSlotIdFromTeamName(
  teamName: string,
  seasonYear: number
): Promise<number | null> {
  const normalized = teamName.trim().toLowerCase()

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

async function main() {
  console.log('🔍 Verifying team slot lookups...\n')

  const tests = [
    // Test CBS retroactive rename scenario
    { name: 'Seal Team Nix', year: 2023, expected: 5 },
    { name: 'Discount Belichick', year: 2023, expected: 5 },
    { name: 'Seal Team Nix', year: 2025, expected: 5 },

    // Test year-specific names
    { name: 'Let Bijans be Bijans', year: 2024, expected: 10 },
    { name: 'Ridley Me This', year: 2023, expected: 10 },
    { name: 'Nabers Think I\'m Selling Dope', year: 2025, expected: 10 },

    // Test stable names
    { name: 'Sweet Chin Music', year: 2023, expected: 8 },
    { name: 'Sweet Chin Music', year: 2025, expected: 8 },

    // Test case insensitivity
    { name: 'SWEET CHIN MUSIC', year: 2024, expected: 8 },
    { name: 'team 4', year: 2024, expected: 6 },

    // Test unknown name
    { name: 'Unknown Team XYZ', year: 2024, expected: null },
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    const result = await getSlotIdFromTeamName(test.name, test.year)
    const status = result === test.expected ? '✅' : '❌'

    if (result === test.expected) {
      passed++
    } else {
      failed++
    }

    console.log(`${status} getSlotIdFromTeamName("${test.name}", ${test.year})`)
    console.log(`   Expected: ${test.expected}, Got: ${result}`)
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`)

  if (failed > 0) {
    process.exit(1)
  }
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
