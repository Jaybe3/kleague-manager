import { db } from '../lib/db';

async function checkJayden() {
  const jayden = await db.player.findFirst({
    where: { firstName: 'Jayden', lastName: 'Daniels' }
  });

  if (!jayden) {
    console.log('Jayden Daniels not found in players table');
    return;
  }

  console.log('=== Jayden Daniels ===');
  console.log('Player ID:', jayden.id);
  console.log('Position:', jayden.position);
  console.log('');

  const allAcquisitions = await db.playerAcquisition.findMany({
    where: { playerId: jayden.id },
    include: { team: true },
    orderBy: [{ seasonYear: 'asc' }, { acquisitionDate: 'asc' }]
  });

  console.log(`All acquisitions (${allAcquisitions.length}):`);
  for (const acq of allAcquisitions) {
    const acqDate = acq.acquisitionDate ? acq.acquisitionDate.toISOString().split('T')[0] : 'null';
    const dropDate = acq.droppedDate ? acq.droppedDate.toISOString().split('T')[0] : 'null';
    console.log(`  ${acq.seasonYear} | Slot ${acq.team.slotId} (${acq.team.teamName})`);
    console.log(`       Type: ${acq.acquisitionType} | Acquired: ${acqDate} | Dropped: ${dropDate}`);
  }

  // Check specifically for slot 10, 2025
  const slot10Team = await db.team.findFirst({
    where: { slotId: 10, seasonYear: 2025 }
  });

  if (!slot10Team) {
    console.log('Slot 10 team not found');
    return;
  }

  const slot10Acq = allAcquisitions.find(a => a.teamId === slot10Team.id);

  console.log('');
  console.log('=== Slot 10 (2025) Status ===');
  if (slot10Acq) {
    console.log('Has acquisition for slot 10: YES');
    console.log('Type:', slot10Acq.acquisitionType);
    console.log('droppedDate:', slot10Acq.droppedDate ? slot10Acq.droppedDate.toISOString().split('T')[0] : 'null');
    console.log('On current roster:', slot10Acq.droppedDate === null ? 'YES' : 'NO');
  } else {
    console.log('Has acquisition for slot 10: NO');
    console.log('NEEDS: TRADE acquisition record for slot 10');
  }
}

checkJayden();
