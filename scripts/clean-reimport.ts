/**
 * Clean Reimport Script
 *
 * Deletes ALL PlayerAcquisition records for 2025 season
 * to allow fresh reimport of draft and FA data.
 *
 * Usage: npx tsx scripts/clean-reimport.ts
 */

import { db } from '../lib/db';

async function cleanReimport() {
  console.log('=== Clean Reimport: Delete 2025 PlayerAcquisition Records ===\n');

  // Count records before deletion
  const beforeCount = await db.playerAcquisition.count({
    where: { seasonYear: 2025 }
  });

  console.log(`Found ${beforeCount} PlayerAcquisition records for 2025\n`);

  if (beforeCount === 0) {
    console.log('No records to delete. Exiting.');
    return;
  }

  // Show breakdown by type
  const byType = await db.playerAcquisition.groupBy({
    by: ['acquisitionType'],
    where: { seasonYear: 2025 },
    _count: true
  });

  console.log('Breakdown by type:');
  for (const group of byType) {
    console.log(`  ${group.acquisitionType}: ${group._count}`);
  }

  // Show breakdown by team
  const byTeam = await db.playerAcquisition.groupBy({
    by: ['teamId'],
    where: { seasonYear: 2025 },
    _count: true
  });

  const teams = await db.team.findMany({
    where: { seasonYear: 2025 },
    select: { id: true, name: true, slotId: true }
  });

  const teamMap = new Map(teams.map(t => [t.id, t]));

  console.log('\nBreakdown by team:');
  for (const group of byTeam) {
    const team = teamMap.get(group.teamId);
    console.log(`  Slot ${team?.slotId}: ${team?.name} - ${group._count} records`);
  }

  console.log('\n--- DELETING ---\n');

  // Delete all 2025 PlayerAcquisition records
  const deleteResult = await db.playerAcquisition.deleteMany({
    where: { seasonYear: 2025 }
  });

  console.log(`Deleted ${deleteResult.count} PlayerAcquisition records for 2025`);

  // Verify deletion
  const afterCount = await db.playerAcquisition.count({
    where: { seasonYear: 2025 }
  });

  console.log(`\nRemaining 2025 records: ${afterCount}`);

  if (afterCount === 0) {
    console.log('\n=== Clean reimport ready. You can now reimport 2025 draft and FA data. ===');
  } else {
    console.log('\nWARNING: Some records may not have been deleted.');
  }
}

cleanReimport()
  .catch(console.error)
  .finally(() => db.$disconnect());
