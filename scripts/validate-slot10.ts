import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function validateSlot10() {
  console.log('=== SLOT 10 (2025) DRAFT VALUE VALIDATION ===\n');

  // Get Slot 10 team for 2025
  const team = await db.team.findFirst({
    where: { slotId: 10, seasonYear: 2025 }
  });

  if (!team) {
    console.log('Team not found');
    return;
  }

  console.log('Team: ' + team.teamName + '\n');

  // Get active roster
  const activeAcqs = await db.playerAcquisition.findMany({
    where: {
      teamId: team.id,
      seasonYear: 2025,
      droppedDate: null
    },
    include: { player: true },
    orderBy: { acquisitionDate: 'asc' }
  });

  console.log('Active roster: ' + activeAcqs.length + ' players\n');

  console.log('Player Name                    | Current Type | Orig Draft Rd | Orig Draft Year | Orig Team Slot');
  console.log('-------------------------------|--------------|---------------|-----------------|---------------');

  for (const acq of activeAcqs) {
    const playerName = (acq.player.firstName + ' ' + acq.player.lastName).padEnd(30);
    const currentType = acq.acquisitionType.padEnd(12);

    // Find original DRAFT acquisition (any team, any year)
    const origDraft = await db.playerAcquisition.findFirst({
      where: {
        playerId: acq.playerId,
        acquisitionType: 'DRAFT'
      },
      include: { team: true },
      orderBy: { seasonYear: 'asc' }
    });

    let draftRound = 'N/A (FA)';
    let draftYear = '';
    let origSlot = '';

    if (origDraft) {
      draftRound = origDraft.draftRound ? 'Round ' + origDraft.draftRound : 'null';
      draftYear = String(origDraft.seasonYear);
      origSlot = 'Slot ' + origDraft.team.slotId;
    }

    console.log(playerName + ' | ' + currentType + ' | ' + draftRound.padEnd(13) + ' | ' + draftYear.padEnd(15) + ' | ' + origSlot);
  }

  // Summary
  console.log('\n=== SUMMARY ===\n');

  let draftCount = 0;
  let faCount = 0;
  let tradeCount = 0;
  let noDraftCount = 0;

  for (const acq of activeAcqs) {
    if (acq.acquisitionType === 'DRAFT') draftCount++;
    else if (acq.acquisitionType === 'FA') faCount++;
    else if (acq.acquisitionType === 'TRADE') tradeCount++;

    const origDraft = await db.playerAcquisition.findFirst({
      where: { playerId: acq.playerId, acquisitionType: 'DRAFT' }
    });
    if (origDraft === null) noDraftCount++;
  }

  console.log('By current acquisition type:');
  console.log('  DRAFT: ' + draftCount);
  console.log('  FA: ' + faCount);
  console.log('  TRADE: ' + tradeCount);
  console.log('');
  console.log('Players with NO original DRAFT (true FAs): ' + noDraftCount);

  // Check Jayden Daniels specifically
  console.log('\n=== JAYDEN DANIELS CHECK ===\n');
  const jayden = await db.player.findFirst({
    where: { firstName: 'Jayden', lastName: 'Daniels' }
  });
  if (jayden) {
    const jaydenDraft = await db.playerAcquisition.findFirst({
      where: { playerId: jayden.id, acquisitionType: 'DRAFT' },
      include: { team: true }
    });
    if (jaydenDraft) {
      console.log('Jayden Daniels original DRAFT:');
      console.log('  Round: ' + jaydenDraft.draftRound);
      console.log('  Pick: ' + jaydenDraft.draftPick);
      console.log('  Year: ' + jaydenDraft.seasonYear);
      console.log('  Team: ' + jaydenDraft.team.teamName + ' (Slot ' + jaydenDraft.team.slotId + ')');
    } else {
      console.log('Jayden Daniels has NO DRAFT record!');
    }
  }

  await db.$disconnect();
}

validateSlot10();
