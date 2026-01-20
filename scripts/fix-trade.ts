import { db } from '../lib/db';

async function fixTrade() {
  // Get slot 10 team for 2025
  const slot10Team = await db.team.findFirst({
    where: { slotId: 10, seasonYear: 2025 }
  });

  // Get slot 8 team for 2025 (Sweet Chin Music - where trade came from)
  const slot8Team = await db.team.findFirst({
    where: { slotId: 8, seasonYear: 2025 }
  });

  if (!slot10Team || !slot8Team) {
    console.log('Teams not found');
    return;
  }

  const tradeDate = new Date('2025-11-25');

  // 1. Set droppedDate on Jordan Love's slot 10 acquisition
  console.log('=== 1. Removing Jordan Love from Slot 10 ===');

  const jordanLove = await db.player.findFirst({
    where: { firstName: 'Jordan', lastName: 'Love' }
  });

  if (!jordanLove) {
    console.log('Jordan Love not found');
    return;
  }

  const jordanAcq = await db.playerAcquisition.findFirst({
    where: {
      playerId: jordanLove.id,
      teamId: slot10Team.id,
      seasonYear: 2025,
      droppedDate: null,
    }
  });

  if (!jordanAcq) {
    console.log('Jordan Love acquisition not found on slot 10');
    return;
  }

  await db.playerAcquisition.update({
    where: { id: jordanAcq.id },
    data: { droppedDate: tradeDate }
  });

  console.log('Set droppedDate = 2025-11-25 on Jordan Love (id: ' + jordanAcq.id + ')');

  // 2. Create TRADE acquisition for Jayden Daniels on slot 10
  console.log('');
  console.log('=== 2. Adding Jayden Daniels to Slot 10 ===');

  const jaydenDaniels = await db.player.findFirst({
    where: { firstName: 'Jayden', lastName: 'Daniels' }
  });

  if (!jaydenDaniels) {
    console.log('Jayden Daniels not found');
    return;
  }

  // Check if TRADE acquisition already exists
  const existingTradeAcq = await db.playerAcquisition.findFirst({
    where: {
      playerId: jaydenDaniels.id,
      teamId: slot10Team.id,
      seasonYear: 2025,
      acquisitionType: 'TRADE',
    }
  });

  if (existingTradeAcq) {
    console.log('TRADE acquisition already exists for Jayden Daniels on slot 10');
  } else {
    // Find original draft info
    const originalDraft = await db.playerAcquisition.findFirst({
      where: {
        playerId: jaydenDaniels.id,
        acquisitionType: 'DRAFT',
      },
      orderBy: { seasonYear: 'asc' }
    });

    const newAcq = await db.playerAcquisition.create({
      data: {
        playerId: jaydenDaniels.id,
        teamId: slot10Team.id,
        seasonYear: 2025,
        acquisitionType: 'TRADE',
        draftRound: originalDraft?.draftRound ?? null,
        draftPick: originalDraft?.draftPick ?? null,
        acquisitionDate: tradeDate,
        tradedFromTeamId: slot8Team.id,
      }
    });

    console.log('Created TRADE acquisition for Jayden Daniels (id: ' + newAcq.id + ')');
    console.log('  acquisitionDate: 2025-11-25');
    console.log('  tradedFromTeamId: ' + slot8Team.id + ' (Slot 8)');
  }

  // Verify results
  console.log('');
  console.log('=== Verification ===');

  // 1. Final roster count
  const rosterCount = await db.playerAcquisition.count({
    where: { teamId: slot10Team.id, seasonYear: 2025, droppedDate: null }
  });
  console.log('');
  console.log('1. Final roster count for slot 10:', rosterCount);

  // 2. Jordan Love status
  const jordanFinal = await db.playerAcquisition.findFirst({
    where: {
      playerId: jordanLove.id,
      teamId: slot10Team.id,
      seasonYear: 2025,
    }
  });
  const jordanOnRoster = jordanFinal && jordanFinal.droppedDate === null;
  console.log('');
  console.log('2. Jordan Love on slot 10 roster:', jordanOnRoster ? 'YES (ERROR!)' : 'NO ✓');
  if (jordanFinal) {
    console.log('   droppedDate:', jordanFinal.droppedDate ? jordanFinal.droppedDate.toISOString().split('T')[0] : 'null');
  }

  // 3. Jayden Daniels status
  const jaydenFinal = await db.playerAcquisition.findFirst({
    where: {
      playerId: jaydenDaniels.id,
      teamId: slot10Team.id,
      seasonYear: 2025,
      droppedDate: null,
    }
  });
  console.log('');
  console.log('3. Jayden Daniels on slot 10 roster:', jaydenFinal ? 'YES ✓' : 'NO (ERROR!)');
  if (jaydenFinal) {
    console.log('   acquisitionType:', jaydenFinal.acquisitionType);
    console.log('   acquisitionDate:', jaydenFinal.acquisitionDate?.toISOString().split('T')[0]);
  }
}

fixTrade();
