import { db } from '../lib/db';

const shouldBeDropped = [
  'DJ Moore',
  'Jordan Love',
  'Russell Wilson',
  'Cooper Kupp',
  'Brandon McManus',
  'Spencer Shrader',
  'Joey Slye',
  'Matt Prater',
  'Dillon Gabriel',
  'Adam Thielen',
];

const missingPlayer = 'Jayden Daniels';

async function investigate() {
  // Get slot 10 team for 2025
  const team = await db.team.findFirst({
    where: { slotId: 10, seasonYear: 2025 }
  });

  if (!team) {
    console.log('No team found');
    return;
  }

  console.log('=== 1. Players That Should Be Dropped ===\n');

  for (const playerName of shouldBeDropped) {
    const [firstName, ...lastParts] = playerName.split(' ');
    const lastName = lastParts.join(' ');

    // Find player
    const player = await db.player.findFirst({
      where: {
        firstName: firstName,
        lastName: lastName,
      }
    });

    if (!player) {
      console.log(`${playerName}: NOT FOUND IN PLAYERS TABLE`);
      console.log('');
      continue;
    }

    // Find their acquisition for slot 10, 2025
    const acquisition = await db.playerAcquisition.findFirst({
      where: {
        playerId: player.id,
        teamId: team.id,
        seasonYear: 2025,
      }
    });

    if (!acquisition) {
      console.log(`${playerName}: Player exists but NO ACQUISITION for slot 10, 2025`);
    } else {
      const acqDate = acquisition.acquisitionDate ? acquisition.acquisitionDate.toISOString().split('T')[0] : 'null';
      const dropDate = acquisition.droppedDate ? acquisition.droppedDate.toISOString().split('T')[0] : 'null';
      console.log(`${playerName}:`);
      console.log(`  Type: ${acquisition.acquisitionType}`);
      console.log(`  Acquisition Date: ${acqDate}`);
      console.log(`  Season Year: ${acquisition.seasonYear}`);
      console.log(`  Dropped Date: ${dropDate}`);
      console.log(`  Draft Round: ${acquisition.draftRound || 'N/A'}`);
    }
    console.log('');
  }

  console.log('=== 2. Missing Player: Jayden Daniels ===\n');

  // Check if Jayden Daniels exists
  const jayden = await db.player.findFirst({
    where: {
      firstName: 'Jayden',
      lastName: 'Daniels',
    }
  });

  if (!jayden) {
    console.log('Jayden Daniels: NOT FOUND IN PLAYERS TABLE');
  } else {
    console.log('Jayden Daniels found in players table:');
    console.log(`  Player ID: ${jayden.id}`);
    console.log(`  Position: ${jayden.position}`);
    console.log(`  Match Key: ${jayden.playerMatchKey}`);

    // Check all his acquisitions
    const allAcquisitions = await db.playerAcquisition.findMany({
      where: { playerId: jayden.id },
      include: { team: true },
      orderBy: { seasonYear: 'asc' }
    });

    console.log(`\n  All acquisitions (${allAcquisitions.length}):`);
    for (const acq of allAcquisitions) {
      const acqDate = acq.acquisitionDate ? acq.acquisitionDate.toISOString().split('T')[0] : 'null';
      console.log(`    ${acq.seasonYear} | Slot ${acq.team.slotId} (${acq.team.teamName}) | ${acq.acquisitionType} | ${acqDate}`);
    }

    // Specifically check for slot 10, 2025
    const slot10Acq = allAcquisitions.find(a => a.team.slotId === 10 && a.seasonYear === 2025);
    if (slot10Acq) {
      console.log('\n  Has acquisition for slot 10, 2025: YES');
    } else {
      console.log('\n  Has acquisition for slot 10, 2025: NO');
    }
  }

  console.log('\n=== 3. Drop Transaction Analysis ===\n');

  // Get all drops for slot 10, 2025 to see what WAS recorded
  const recordedDrops = await db.playerAcquisition.findMany({
    where: {
      teamId: team.id,
      seasonYear: 2025,
      droppedDate: { not: null },
    },
    include: { player: true },
    orderBy: { droppedDate: 'asc' }
  });

  console.log(`Recorded drops for slot 10, 2025: ${recordedDrops.length}`);
  for (const drop of recordedDrops) {
    const dropDate = drop.droppedDate!.toISOString().split('T')[0];
    console.log(`  ${drop.player.firstName} ${drop.player.lastName} - dropped ${dropDate}`);
  }

  // Check date range of FA transactions imported
  const allFAForTeam = await db.playerAcquisition.findMany({
    where: {
      teamId: team.id,
      seasonYear: 2025,
      acquisitionType: 'FA',
    },
    orderBy: { acquisitionDate: 'asc' }
  });

  if (allFAForTeam.length > 0) {
    const earliest = allFAForTeam[0].acquisitionDate?.toISOString().split('T')[0];
    const latest = allFAForTeam[allFAForTeam.length - 1].acquisitionDate?.toISOString().split('T')[0];
    console.log(`\nFA transaction date range: ${earliest} to ${latest}`);
  }

  // Check total drops across ALL teams for 2025
  const allDrops2025 = await db.playerAcquisition.count({
    where: {
      seasonYear: 2025,
      droppedDate: { not: null },
    }
  });
  console.log(`\nTotal drops recorded across ALL teams for 2025: ${allDrops2025}`);
}

investigate();
