import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function getSamLaPorta() {
  const player = await db.player.findFirst({
    where: { firstName: 'Sam', lastName: 'LaPorta' }
  });

  if (player === null) {
    console.log('Sam LaPorta not found');
    return;
  }

  console.log('=== SAM LAPORTA ACQUISITION HISTORY ===\n');
  console.log('Player ID: ' + player.id);
  console.log('');

  const acqs = await db.playerAcquisition.findMany({
    where: { playerId: player.id },
    include: { team: true },
    orderBy: { acquisitionDate: 'asc' }
  });

  console.log('Team (Slot)              | Year | Type  | Draft Rd | Acq Date   | Drop Date');
  console.log('-------------------------|------|-------|----------|------------|----------');

  for (const a of acqs) {
    const teamName = (a.team.teamName + ' (' + a.team.slotId + ')').padEnd(24);
    const year = String(a.seasonYear);
    const type = a.acquisitionType.padEnd(5);
    const draftRd = a.draftRound ? 'Rd ' + String(a.draftRound).padStart(2) : 'null'.padStart(5);
    const acqDate = a.acquisitionDate ? a.acquisitionDate.toISOString().split('T')[0] : 'null';
    const dropDate = a.droppedDate ? a.droppedDate.toISOString().split('T')[0] : 'null';

    console.log(teamName + ' | ' + year + ' | ' + type + ' | ' + draftRd + '    | ' + acqDate + ' | ' + dropDate);
  }

  console.log('\nTotal acquisitions: ' + acqs.length);

  await db.$disconnect();
}

getSamLaPorta();
