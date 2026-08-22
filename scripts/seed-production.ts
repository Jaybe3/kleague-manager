import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding production database...\n')

  // 1. Make user commissioner
  const userId = 'cmkiowvdy0000i4mgh0b5cjeg'

  const user = await prisma.user.update({
    where: { id: userId },
    data: { isCommissioner: true },
  })
  console.log(`✅ Made ${user.displayName} (${user.email}) a commissioner`)

  // 2. Create seasons
  const season2024 = await prisma.season.upsert({
    where: { year: 2024 },
    update: {},
    create: {
      year: 2024,
      draftDate: new Date('2024-09-01T18:00:00Z'),
      keeperDeadline: new Date('2024-08-25T23:59:59-04:00'), // 11:59:59 PM Eastern
      totalRounds: 28,
      isActive: true,
    },
  })
  console.log(`✅ Created/verified 2024 season (active: ${season2024.isActive})`)

  const season2025 = await prisma.season.upsert({
    where: { year: 2025 },
    update: {},
    create: {
      year: 2025,
      draftDate: new Date('2025-09-01T18:00:00Z'),
      keeperDeadline: new Date('2025-08-25T23:59:59-04:00'), // 11:59:59 PM Eastern
      totalRounds: 28,
      isActive: false,
    },
  })
  console.log(`✅ Created/verified 2025 season (active: ${season2025.isActive})`)

  console.log('\n🎉 Production seed complete!')
  console.log('\nNext steps:')
  console.log('1. Log in to the app as commissioner')
  console.log('2. Use Admin > Import to upload teams/players from Excel')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
