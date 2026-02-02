/**
 * ROLLBACK SCRIPT: Orphaned Active Acquisitions
 *
 * This script restores the original droppedDate values from the backup file.
 * Use this if the fix caused any issues.
 *
 * Run with: npx tsx scripts/rollback-orphaned-acquisitions.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface AcquisitionRecord {
  id: string;
  dropped_date: string | null;
}

interface BackupData {
  timestamp: string;
  totalRecords: number;
  affectedPlayers: number;
  acquisitions: AcquisitionRecord[];
}

async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║         ROLLBACK ORPHANED ACQUISITIONS FIX                                 ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  const backupPath = path.join(process.cwd(), 'data', 'backup-orphaned-acquisitions-2026-02-02.json');

  if (!fs.existsSync(backupPath)) {
    console.log('❌ BACKUP FILE NOT FOUND');
    console.log(`   Expected: ${backupPath}`);
    await prisma.$disconnect();
    process.exit(1);
  }

  const backup: BackupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

  console.log(`Found backup from: ${backup.timestamp}`);
  console.log(`Records to restore: ${backup.totalRecords}`);
  console.log('');

  console.log('Restoring original droppedDate values...');

  let restored = 0;
  for (const record of backup.acquisitions) {
    await prisma.playerAcquisition.update({
      where: { id: record.id },
      data: {
        droppedDate: record.dropped_date ? new Date(record.dropped_date) : null,
      },
    });
    restored++;
  }

  console.log('');
  console.log(`✅ Restored ${restored} records to their original state`);
  console.log('');

  // Verify
  const stillAffected = await prisma.$queryRaw<{ player_id: string }[]>`
    SELECT DISTINCT player_id
    FROM player_acquisitions
    WHERE dropped_date IS NULL
    GROUP BY player_id
    HAVING COUNT(DISTINCT slot_id) > 1
  `;

  console.log(`Players with orphaned acquisitions (expected ~161): ${stillAffected.length}`);
  console.log('');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('ERROR:', e);
  await prisma.$disconnect();
  process.exit(1);
});
