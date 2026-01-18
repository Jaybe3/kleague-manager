import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Team slot data with name history
 * Each slot represents a permanent "seat" in the league (1-10)
 * Aliases track team names across years (handles CBS retroactive renames)
 */
const SLOT_DATA = [
  {
    slotId: 1,
    names: [
      { name: 'Gatordontplay', from: 2023, to: 2024 },
      { name: 'Gatordontplayanymorebchesucked', from: 2025, to: null },
    ],
  },
  {
    slotId: 2,
    names: [
      { name: 'Box of Rocks', from: 2023, to: 2024 },
      { name: 'run ACHANE on her', from: 2025, to: null },
    ],
  },
  {
    slotId: 3,
    names: [
      { name: 'Woody and the Jets!', from: 2023, to: null },
    ],
  },
  {
    slotId: 4,
    names: [
      { name: 'Go Go Garrett', from: 2023, to: 2024 },
      { name: 'The Better Business Burrow', from: 2025, to: null },
    ],
  },
  {
    slotId: 5,
    names: [
      { name: 'Discount Belichick', from: 2023, to: 2024 },
      { name: 'Seal Team Nix', from: 2025, to: null },
    ],
  },
  {
    slotId: 6,
    names: [
      { name: 'Team 4', from: 2023, to: null },
    ],
  },
  {
    slotId: 7,
    names: [
      { name: 'The Bushwhackers', from: 2023, to: null },
    ],
  },
  {
    slotId: 8,
    names: [
      { name: 'Sweet Chin Music', from: 2023, to: null },
    ],
  },
  {
    slotId: 9,
    names: [
      { name: 'Fields of Dreams', from: 2023, to: null },
    ],
  },
  {
    slotId: 10,
    names: [
      { name: 'Ridley Me This', from: 2023, to: 2023 },
      { name: 'Let Bijans be Bijans', from: 2024, to: 2024 },
      { name: 'Nabers Think I\'m Selling Dope', from: 2025, to: null },
    ],
  },
]

async function main() {
  console.log('🎰 Seeding team slots and aliases...\n')

  // Create all 10 slots
  for (let i = 1; i <= 10; i++) {
    await prisma.teamSlot.upsert({
      where: { id: i },
      update: {},
      create: { id: i },
    })
  }
  console.log('✅ Created 10 team slots')

  // Create aliases for each slot
  let aliasCount = 0
  for (const slot of SLOT_DATA) {
    for (const nameEntry of slot.names) {
      await prisma.teamAlias.upsert({
        where: {
          slotId_teamName: {
            slotId: slot.slotId,
            teamName: nameEntry.name,
          },
        },
        update: {
          validFrom: nameEntry.from,
          validTo: nameEntry.to,
        },
        create: {
          slotId: slot.slotId,
          teamName: nameEntry.name,
          validFrom: nameEntry.from,
          validTo: nameEntry.to,
        },
      })
      aliasCount++
    }
  }
  console.log(`✅ Created ${aliasCount} team aliases`)

  // Display summary
  console.log('\n📋 Slot Summary:')
  const slots = await prisma.teamSlot.findMany({
    include: { aliases: true },
    orderBy: { id: 'asc' },
  })

  for (const slot of slots) {
    const currentName = slot.aliases.find(a => a.validTo === null)?.teamName || 'Unknown'
    const historyCount = slot.aliases.length
    console.log(`   Slot ${slot.id}: ${currentName} (${historyCount} name${historyCount > 1 ? 's' : ''})`)
  }

  console.log('\n🎉 Team slot seeding complete!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
