import { db } from '../lib/db';

async function diagnose() {
  // Find the team for slot 10, season 2025
  const team = await db.team.findFirst({
    where: { slotId: 10, seasonYear: 2025 }
  });

  if (!team) {
    console.log('No team found for slot 10, 2025');
    return;
  }

  console.log('=== Team Info ===');
  console.log('Team ID:', team.id);
  console.log('Team Name:', team.teamName);
  console.log('Slot:', team.slotId);
  console.log('Season:', team.seasonYear);

  // Get ALL acquisitions for this team (not filtering droppedDate)
  const allAcquisitions = await db.playerAcquisition.findMany({
    where: {
      teamId: team.id,
      seasonYear: 2025,
    },
    include: { player: true },
    orderBy: [
      { droppedDate: 'asc' },
      { acquisitionType: 'asc' },
      { draftRound: 'asc' },
    ],
  });

  console.log('');
  console.log('=== 1. Total Acquisitions for Slot 10, 2025 ===');
  console.log('Total:', allAcquisitions.length);

  const withDroppedDate = allAcquisitions.filter(a => a.droppedDate !== null);
  const withoutDroppedDate = allAcquisitions.filter(a => a.droppedDate === null);

  console.log('');
  console.log('=== 3. Breakdown ===');
  console.log('droppedDate = null (current roster):', withoutDroppedDate.length);
  console.log('droppedDate set (dropped players):', withDroppedDate.length);

  console.log('');
  console.log('=== 2. All Players ===');
  console.log('');
  console.log('--- Current Roster (droppedDate = null) ---');
  for (const acq of withoutDroppedDate) {
    console.log(`${acq.player.firstName} ${acq.player.lastName} | ${acq.acquisitionType} | ${acq.seasonYear} | droppedDate: null`);
  }

  console.log('');
  console.log('--- Dropped Players (droppedDate set) ---');
  for (const acq of withDroppedDate) {
    const dropDate = acq.droppedDate ? acq.droppedDate.toISOString().split('T')[0] : 'null';
    console.log(`${acq.player.firstName} ${acq.player.lastName} | ${acq.acquisitionType} | ${acq.seasonYear} | droppedDate: ${dropDate}`);
  }
}

diagnose();
