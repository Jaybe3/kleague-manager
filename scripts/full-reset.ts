/**
 * Full Database Reset Script
 *
 * Deletes ALL transactional data to prepare for clean reimport.
 * Keeps reference data: TeamSlot, TeamAlias, User, AuditLog
 *
 * Usage: npx tsx scripts/full-reset.ts
 */

import { db } from '../lib/db';
import * as readline from 'readline';

async function promptConfirmation(message: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function fullReset() {
  console.log('=== FULL DATABASE RESET ===\n');

  // Get counts of what will be deleted
  const keeperCount = await db.keeperSelection.count();
  const acquisitionCount = await db.playerAcquisition.count();
  const playerCount = await db.player.count();
  const teamCount = await db.team.count();
  const seasonCount = await db.season.count();

  // Get counts of what will be kept
  const slotCount = await db.teamSlot.count();
  const aliasCount = await db.teamAlias.count();
  const userCount = await db.user.count();

  // Show what will be deleted
  console.log('This will DELETE all season data:');
  console.log(`  - KeeperSelection: ${keeperCount} records`);
  console.log(`  - PlayerAcquisition: ${acquisitionCount} records`);
  console.log(`  - Player: ${playerCount} records`);
  console.log(`  - Team: ${teamCount} records`);
  console.log(`  - Season: ${seasonCount} records`);
  console.log('');

  // Show what will be kept
  console.log('This will KEEP:');
  console.log(`  - TeamSlot: ${slotCount} records`);
  console.log(`  - TeamAlias: ${aliasCount} records`);
  console.log(`  - User: ${userCount} records`);
  console.log('');

  // Show breakdown by year
  console.log('Breakdown by year:');
  const years = [2023, 2024, 2025];
  for (const year of years) {
    const acqCount = await db.playerAcquisition.count({
      where: { seasonYear: year }
    });
    const teamYearCount = await db.team.count({
      where: { seasonYear: year }
    });
    console.log(`  ${year}: ${teamYearCount} teams, ${acqCount} acquisitions`);
  }
  console.log('');

  // Require confirmation
  const confirmation = await promptConfirmation('Type "DELETE ALL DATA" to confirm: ');

  if (confirmation !== 'DELETE ALL DATA') {
    console.log('\nAborted. No data was deleted.');
    return;
  }

  console.log('\n--- DELETING ---\n');

  // Delete in correct order (child tables first due to foreign keys)

  // 1. KeeperSelection (references Player, Team)
  const deletedKeepers = await db.keeperSelection.deleteMany();
  console.log(`Deleting KeeperSelection... ${deletedKeepers.count} deleted`);

  // 2. PlayerAcquisition (references Player, Team)
  const deletedAcquisitions = await db.playerAcquisition.deleteMany();
  console.log(`Deleting PlayerAcquisition... ${deletedAcquisitions.count} deleted`);

  // 3. Player (no remaining references)
  const deletedPlayers = await db.player.deleteMany();
  console.log(`Deleting Player... ${deletedPlayers.count} deleted`);

  // 4. Team (no remaining references)
  const deletedTeams = await db.team.deleteMany();
  console.log(`Deleting Team... ${deletedTeams.count} deleted`);

  // 5. Season (no remaining references)
  const deletedSeasons = await db.season.deleteMany();
  console.log(`Deleting Season... ${deletedSeasons.count} deleted`);

  console.log('\n=== RESET COMPLETE ===\n');

  // Verify deletion
  const remainingAcquisitions = await db.playerAcquisition.count();
  const remainingPlayers = await db.player.count();
  const remainingTeams = await db.team.count();
  const remainingSeasons = await db.season.count();

  console.log('Verification (should all be 0):');
  console.log(`  PlayerAcquisition: ${remainingAcquisitions}`);
  console.log(`  Player: ${remainingPlayers}`);
  console.log(`  Team: ${remainingTeams}`);
  console.log(`  Season: ${remainingSeasons}`);
  console.log('');

  // Show what was preserved
  const finalSlots = await db.teamSlot.count();
  const finalAliases = await db.teamAlias.count();
  const finalUsers = await db.user.count();

  console.log('Preserved data:');
  console.log(`  TeamSlot: ${finalSlots}`);
  console.log(`  TeamAlias: ${finalAliases}`);
  console.log(`  User: ${finalUsers}`);
  console.log('');

  console.log('Ready for reimport. Run imports in this order:');
  console.log('  1. 2023 Draft');
  console.log('  2. 2023 FA');
  console.log('  3. 2024 Draft');
  console.log('  4. 2024 FA');
  console.log('  5. 2025 Draft');
  console.log('  6. 2025 FA');
}

fullReset()
  .catch(console.error)
  .finally(() => db.$disconnect());
