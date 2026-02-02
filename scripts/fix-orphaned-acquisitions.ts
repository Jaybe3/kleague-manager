/**
 * FIX SCRIPT: Orphaned Active Acquisitions
 *
 * This script:
 * 1. Creates a backup of all affected acquisitions
 * 2. Sets droppedDate on orphaned records
 * 3. Verifies the fix
 * 4. Spot checks specific players
 *
 * Run with: npx tsx scripts/fix-orphaned-acquisitions.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface AcquisitionRecord {
  id: string;
  player_id: string;
  team_id: string | null;
  slot_id: number | null;
  season_year: number;
  acquisition_type: string;
  acquisition_date: Date;
  draft_round: number | null;
  draft_pick: number | null;
  dropped_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface PlayerAcquisition {
  id: string;
  playerId: string;
  slotId: number | null;
  acquisitionDate: Date;
  droppedDate: Date | null;
}

interface BackupData {
  timestamp: string;
  totalRecords: number;
  affectedPlayers: number;
  acquisitions: AcquisitionRecord[];
}

async function createBackup(): Promise<BackupData | null> {
  console.log('='.repeat(80));
  console.log('STEP 1: Creating Backup');
  console.log('='.repeat(80));
  console.log('');

  // Get all acquisitions for affected players
  const acquisitions = await prisma.$queryRaw<AcquisitionRecord[]>`
    SELECT * FROM player_acquisitions
    WHERE player_id IN (
      SELECT player_id FROM player_acquisitions
      WHERE dropped_date IS NULL
      GROUP BY player_id
      HAVING COUNT(DISTINCT slot_id) > 1
    )
    ORDER BY player_id, acquisition_date
  `;

  // Count affected players
  const affectedCount = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(DISTINCT player_id) as count
    FROM player_acquisitions
    WHERE dropped_date IS NULL
    GROUP BY player_id
    HAVING COUNT(DISTINCT slot_id) > 1
  `;

  const backup: BackupData = {
    timestamp: new Date().toISOString(),
    totalRecords: acquisitions.length,
    affectedPlayers: affectedCount.length,
    acquisitions: acquisitions,
  };

  const backupPath = path.join(process.cwd(), 'data', 'backup-orphaned-acquisitions-2026-02-02.json');

  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));

  console.log(`✅ Backup created: ${backupPath}`);
  console.log(`   - Timestamp: ${backup.timestamp}`);
  console.log(`   - Affected players: ${backup.affectedPlayers}`);
  console.log(`   - Total records backed up: ${backup.totalRecords}`);
  console.log('');

  return backup;
}

async function verifyBackup(): Promise<boolean> {
  console.log('='.repeat(80));
  console.log('STEP 2: Verifying Backup');
  console.log('='.repeat(80));
  console.log('');

  const backupPath = path.join(process.cwd(), 'data', 'backup-orphaned-acquisitions-2026-02-02.json');

  if (!fs.existsSync(backupPath)) {
    console.log('❌ BACKUP FILE NOT FOUND - ABORTING');
    return false;
  }

  const stats = fs.statSync(backupPath);
  const backup: BackupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

  console.log(`✅ Backup file exists`);
  console.log(`   - Size: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`   - Records: ${backup.totalRecords}`);
  console.log(`   - Affected players: ${backup.affectedPlayers}`);
  console.log('');

  if (backup.totalRecords === 0) {
    console.log('❌ BACKUP HAS NO RECORDS - ABORTING');
    return false;
  }

  return true;
}

async function executeFix(): Promise<number> {
  console.log('='.repeat(80));
  console.log('STEP 3: Executing Fix');
  console.log('='.repeat(80));
  console.log('');

  // Get all players with multiple active acquisitions on different slots
  const affectedPlayers = await prisma.$queryRaw<{ player_id: string }[]>`
    SELECT DISTINCT player_id
    FROM player_acquisitions
    WHERE dropped_date IS NULL
    GROUP BY player_id
    HAVING COUNT(DISTINCT slot_id) > 1
  `;

  console.log(`Processing ${affectedPlayers.length} affected players...`);
  console.log('');

  let totalUpdated = 0;

  for (const { player_id } of affectedPlayers) {
    // Get all active acquisitions for this player, ordered by date DESC (most recent first)
    const acquisitions = await prisma.playerAcquisition.findMany({
      where: {
        playerId: player_id,
        droppedDate: null,
      },
      orderBy: {
        acquisitionDate: 'desc',
      },
    });

    if (acquisitions.length <= 1) {
      continue; // No orphans for this player
    }

    // Skip the first one (most recent = current)
    // For each remaining, set droppedDate to day before the next acquisition
    for (let i = 1; i < acquisitions.length; i++) {
      const orphanedAcq = acquisitions[i];
      const nextAcq = acquisitions[i - 1]; // The one that came after this chronologically

      // Set droppedDate to one day before the next acquisition
      const droppedDate = new Date(nextAcq.acquisitionDate);
      droppedDate.setDate(droppedDate.getDate() - 1);

      await prisma.playerAcquisition.update({
        where: { id: orphanedAcq.id },
        data: { droppedDate: droppedDate },
      });

      totalUpdated++;
    }
  }

  console.log(`✅ Updated ${totalUpdated} orphaned acquisitions`);
  console.log('');

  return totalUpdated;
}

async function verifyFix(): Promise<boolean> {
  console.log('='.repeat(80));
  console.log('STEP 4: Verifying Fix');
  console.log('='.repeat(80));
  console.log('');

  const stillAffected = await prisma.$queryRaw<{ player_id: string }[]>`
    SELECT DISTINCT player_id
    FROM player_acquisitions
    WHERE dropped_date IS NULL
    GROUP BY player_id
    HAVING COUNT(DISTINCT slot_id) > 1
  `;

  if (stillAffected.length === 0) {
    console.log('✅ VERIFICATION PASSED: 0 players with orphaned acquisitions');
    console.log('');
    return true;
  } else {
    console.log(`❌ VERIFICATION FAILED: ${stillAffected.length} players still have orphaned acquisitions`);
    console.log('');
    return false;
  }
}

async function spotCheck(): Promise<void> {
  console.log('='.repeat(80));
  console.log('STEP 5: Spot Check');
  console.log('='.repeat(80));
  console.log('');

  // Check 3 specific players
  const playersToCheck = [
    { name: 'Sam LaPorta', firstName: 'Sam', lastName: 'LaPorta' },
    { name: 'Josh Allen', firstName: 'Josh', lastName: 'Allen' },
    { name: 'Patrick Mahomes', firstName: 'Patrick', lastName: 'Mahomes' },
  ];

  for (const player of playersToCheck) {
    console.log(`📋 ${player.name}`);
    console.log('─'.repeat(60));

    // Find the player
    const p = await prisma.player.findFirst({
      where: {
        firstName: player.firstName,
        lastName: player.lastName,
      },
    });

    if (!p) {
      console.log(`   Player not found`);
      console.log('');
      continue;
    }

    // Get all their acquisitions
    const acquisitions = await prisma.playerAcquisition.findMany({
      where: { playerId: p.id },
      orderBy: { acquisitionDate: 'desc' },
    });

    console.log(`   Total acquisitions: ${acquisitions.length}`);

    const active = acquisitions.filter(a => a.droppedDate === null);
    const dropped = acquisitions.filter(a => a.droppedDate !== null);

    console.log(`   Active (droppedDate=null): ${active.length}`);
    console.log(`   Dropped (has droppedDate): ${dropped.length}`);

    if (active.length === 1) {
      console.log(`   ✅ Exactly 1 active acquisition (correct)`);
      console.log(`      Current slot: ${active[0].slotId}, Season: ${active[0].seasonYear}`);
    } else if (active.length === 0) {
      console.log(`   ⚠️ No active acquisitions (player may be dropped)`);
    } else {
      // Check if multiple active are on SAME slot (valid for keepers)
      const slots = new Set(active.map(a => a.slotId));
      if (slots.size === 1) {
        console.log(`   ✅ ${active.length} active acquisitions on same slot (keeper chain - correct)`);
      } else {
        console.log(`   ❌ ${active.length} active acquisitions on ${slots.size} different slots (still orphaned!)`);
      }
    }

    console.log('');
  }
}

async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║         FIX ORPHANED ACQUISITIONS - WITH BACKUP                            ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  // Step 1: Create backup
  const backup = await createBackup();
  if (!backup) {
    console.log('❌ BACKUP CREATION FAILED - ABORTING');
    await prisma.$disconnect();
    process.exit(1);
  }

  // Step 2: Verify backup
  const backupVerified = await verifyBackup();
  if (!backupVerified) {
    console.log('❌ BACKUP VERIFICATION FAILED - ABORTING');
    await prisma.$disconnect();
    process.exit(1);
  }

  // Step 3: Execute fix
  const updatedCount = await executeFix();

  // Step 4: Verify fix
  const fixVerified = await verifyFix();

  // Step 5: Spot check
  await spotCheck();

  // Summary
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log('');
  console.log(`Backup file: data/backup-orphaned-acquisitions-2026-02-02.json`);
  console.log(`Records backed up: ${backup.totalRecords}`);
  console.log(`Orphaned records fixed: ${updatedCount}`);
  console.log(`Verification: ${fixVerified ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('');
  console.log('─'.repeat(80));
  console.log('ROLLBACK INSTRUCTIONS (if needed):');
  console.log('─'.repeat(80));
  console.log(`
// To rollback, run:
// npx tsx scripts/rollback-orphaned-acquisitions.ts

// Or manually:
const backup = JSON.parse(fs.readFileSync('data/backup-orphaned-acquisitions-2026-02-02.json'));
for (const record of backup.acquisitions) {
  await prisma.playerAcquisition.update({
    where: { id: record.id },
    data: { droppedDate: record.dropped_date }  // Original value (null or date)
  });
}
`);
  console.log('');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('ERROR:', e);
  await prisma.$disconnect();
  process.exit(1);
});
