/**
 * DIAGNOSTIC SCRIPT - READ-ONLY
 * Identifies players with multiple active acquisitions on different slots
 *
 * Run with: npx tsx scripts/diagnose-orphaned-acquisitions.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AffectedPlayer {
  first_name: string;
  last_name: string;
  player_id: string;
  active_slot_count: bigint;
  total_active_acquisitions: bigint;
}

interface AcquisitionDetail {
  first_name: string;
  last_name: string;
  slot_id: number;
  season_year: number;
  acquisition_type: string;
  draft_round: number | null;
  acquisition_date: Date;
  id: string;
}

async function main() {
  console.log('='.repeat(80));
  console.log('DIAGNOSTIC: Orphaned Active Acquisitions');
  console.log('='.repeat(80));
  console.log('');
  console.log('This script identifies players with multiple "active" acquisitions');
  console.log('(droppedDate = NULL) on DIFFERENT slots - indicating orphaned records.');
  console.log('');

  // Step 1: Find all affected players
  console.log('-'.repeat(80));
  console.log('STEP 1: Finding players with active acquisitions on multiple slots...');
  console.log('-'.repeat(80));
  console.log('');

  const affected = await prisma.$queryRaw<AffectedPlayer[]>`
    SELECT
      p.first_name,
      p.last_name,
      p.id as player_id,
      COUNT(DISTINCT pa.slot_id) as active_slot_count,
      COUNT(*) as total_active_acquisitions
    FROM player_acquisitions pa
    JOIN players p ON pa.player_id = p.id
    WHERE pa.dropped_date IS NULL
    GROUP BY p.id, p.first_name, p.last_name
    HAVING COUNT(DISTINCT pa.slot_id) > 1
    ORDER BY p.last_name, p.first_name
  `;

  console.log(`Found ${affected.length} affected player(s)`);
  console.log('');

  if (affected.length === 0) {
    console.log('✅ No orphaned acquisitions found. Database is clean.');
    await prisma.$disconnect();
    return;
  }

  // Show summary table
  console.log('SUMMARY:');
  console.log('┌────────────────────────────┬───────────────┬─────────────────────┐');
  console.log('│ Player                     │ Active Slots  │ Total Acquisitions  │');
  console.log('├────────────────────────────┼───────────────┼─────────────────────┤');
  for (const player of affected) {
    const name = `${player.first_name} ${player.last_name}`.padEnd(26);
    const slots = String(player.active_slot_count).padStart(6);
    const total = String(player.total_active_acquisitions).padStart(10);
    console.log(`│ ${name} │ ${slots}        │ ${total}          │`);
  }
  console.log('└────────────────────────────┴───────────────┴─────────────────────┘');
  console.log('');

  // Step 2: Get detailed acquisitions for each affected player
  console.log('-'.repeat(80));
  console.log('STEP 2: Detailed acquisition records for each affected player...');
  console.log('-'.repeat(80));
  console.log('');

  const details = await prisma.$queryRaw<AcquisitionDetail[]>`
    SELECT
      p.first_name,
      p.last_name,
      pa.slot_id,
      pa.season_year,
      pa.acquisition_type,
      pa.draft_round,
      pa.acquisition_date,
      pa.id
    FROM player_acquisitions pa
    JOIN players p ON pa.player_id = p.id
    WHERE pa.dropped_date IS NULL
    AND pa.player_id IN (
      SELECT player_id FROM player_acquisitions
      WHERE dropped_date IS NULL
      GROUP BY player_id
      HAVING COUNT(DISTINCT slot_id) > 1
    )
    ORDER BY p.last_name, p.first_name, pa.acquisition_date DESC
  `;

  // Group by player for display
  const byPlayer = new Map<string, AcquisitionDetail[]>();
  for (const detail of details) {
    const key = `${detail.first_name} ${detail.last_name}`;
    if (!byPlayer.has(key)) {
      byPlayer.set(key, []);
    }
    byPlayer.get(key)!.push(detail);
  }

  // Display details for each player
  for (const [playerName, acquisitions] of byPlayer) {
    console.log(`\n📋 ${playerName}`);
    console.log('─'.repeat(70));
    console.log('');
    console.log('   Status      │ Slot │ Season │ Type   │ Round │ Date       │ ID');
    console.log('  ─────────────┼──────┼────────┼────────┼───────┼────────────┼──────────');

    // Sort by date descending (most recent first)
    acquisitions.sort((a, b) =>
      new Date(b.acquisition_date).getTime() - new Date(a.acquisition_date).getTime()
    );

    let isFirst = true;
    for (const acq of acquisitions) {
      const status = isFirst ? '✅ CURRENT  ' : '⚠️  ORPHANED ';
      const slot = String(acq.slot_id).padStart(4);
      const season = String(acq.season_year).padStart(6);
      const type = acq.acquisition_type.padEnd(6);
      const round = acq.draft_round ? `R${String(acq.draft_round).padStart(2)}` : ' FA ';
      const date = new Date(acq.acquisition_date).toISOString().split('T')[0];
      const shortId = acq.id.slice(0, 8);

      console.log(`  ${status} │ ${slot} │ ${season} │ ${type} │ ${round}  │ ${date} │ ${shortId}`);
      isFirst = false;
    }
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('ANALYSIS COMPLETE');
  console.log('='.repeat(80));
  console.log('');
  console.log('Legend:');
  console.log('  ✅ CURRENT  = Most recent acquisition (latest date) - should remain active');
  console.log('  ⚠️  ORPHANED = Older acquisition on different slot - needs droppedDate set');
  console.log('');
  console.log('To fix: Set droppedDate on ORPHANED records to match when player left that slot.');
  console.log('');
  console.log('⚠️  THIS WAS READ-ONLY - NO DATA WAS MODIFIED');
  console.log('');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
