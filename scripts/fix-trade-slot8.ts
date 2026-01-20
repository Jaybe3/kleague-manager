import { db } from '../lib/db';

async function fixTradeSlot8() {
  const slot8Team = await db.team.findFirst({
    where: { slotId: 8, seasonYear: 2025 }
  });

  const slot10Team = await db.team.findFirst({
    where: { slotId: 10, seasonYear: 2025 }
  });

  if (!slot8Team || !slot10Team) {
    console.log('Teams not found');
    return;
  }

  const tradeDate = new Date('2025-11-25');

  // Get both players
  const jordanLove = await db.player.findFirst({
    where: { firstName: 'Jordan', lastName: 'Love' }
  });

  const jaydenDaniels = await db.player.findFirst({
    where: { firstName: 'Jayden', lastName: 'Daniels' }
  });

  if (!jordanLove || !jaydenDaniels) {
    console.log('Players not found');
    return;
  }

  // === BEFORE STATE ===
  console.log('=== BEFORE STATE ===\n');

  // Jordan Love's acquisitions
  const jordanAcqsBefore = await db.playerAcquisition.findMany({
    where: { playerId: jordanLove.id },
    include: { team: true },
    orderBy: [{ seasonYear: 'asc' }, { acquisitionDate: 'asc' }]
  });

  console.log('Jordan Love acquisitions:');
  for (const acq of jordanAcqsBefore) {
    const acqDate = acq.acquisitionDate?.toISOString().split('T')[0] || 'null';
    const dropDate = acq.droppedDate?.toISOString().split('T')[0] || 'null';
    console.log(`  ${acq.seasonYear} | Slot ${acq.team.slotId} | ${acq.acquisitionType} | Acq: ${acqDate} | Drop: ${dropDate}`);
  }

  const jordanSlot8Acq = jordanAcqsBefore.find(a => a.team.slotId === 8 && a.seasonYear === 2025);
  console.log(`\n  Has TRADE on slot 8 (2025): ${jordanSlot8Acq?.acquisitionType === 'TRADE' ? 'YES' : 'NO - NEEDS FIX'}`);

  // Jayden Daniels' acquisitions
  const jaydenAcqsBefore = await db.playerAcquisition.findMany({
    where: { playerId: jaydenDaniels.id },
    include: { team: true },
    orderBy: [{ seasonYear: 'asc' }, { acquisitionDate: 'asc' }]
  });

  console.log('\nJayden Daniels acquisitions:');
  for (const acq of jaydenAcqsBefore) {
    const acqDate = acq.acquisitionDate?.toISOString().split('T')[0] || 'null';
    const dropDate = acq.droppedDate?.toISOString().split('T')[0] || 'null';
    console.log(`  ${acq.seasonYear} | Slot ${acq.team.slotId} | ${acq.acquisitionType} | Acq: ${acqDate} | Drop: ${dropDate}`);
  }

  const jaydenSlot8Acq = jaydenAcqsBefore.find(a => a.team.slotId === 8 && a.seasonYear === 2025);
  console.log(`\n  Slot 8 FA has droppedDate: ${jaydenSlot8Acq?.droppedDate ? 'YES' : 'NO - NEEDS FIX'}`);

  // === APPLY FIXES ===
  console.log('\n=== APPLYING FIXES ===\n');

  // 1. Jordan Love - create TRADE acquisition on slot 8 if missing
  if (!jordanSlot8Acq || jordanSlot8Acq.acquisitionType !== 'TRADE') {
    // Find original draft info
    const originalDraft = await db.playerAcquisition.findFirst({
      where: { playerId: jordanLove.id, acquisitionType: 'DRAFT' },
      orderBy: { seasonYear: 'asc' }
    });

    const newAcq = await db.playerAcquisition.create({
      data: {
        playerId: jordanLove.id,
        teamId: slot8Team.id,
        seasonYear: 2025,
        acquisitionType: 'TRADE',
        draftRound: originalDraft?.draftRound ?? null,
        draftPick: originalDraft?.draftPick ?? null,
        acquisitionDate: tradeDate,
        tradedFromTeamId: slot10Team.id,
      }
    });
    console.log('1. Created TRADE acquisition for Jordan Love on slot 8');
    console.log(`   ID: ${newAcq.id}`);
    console.log(`   acquisitionDate: 2025-11-25`);
    console.log(`   tradedFromTeamId: ${slot10Team.id} (Slot 10)`);
  } else {
    console.log('1. Jordan Love already has TRADE on slot 8 - no fix needed');
  }

  // 2. Jayden Daniels - set droppedDate on slot 8 FA if not set
  if (jaydenSlot8Acq && !jaydenSlot8Acq.droppedDate) {
    await db.playerAcquisition.update({
      where: { id: jaydenSlot8Acq.id },
      data: { droppedDate: tradeDate }
    });
    console.log('\n2. Set droppedDate on Jayden Daniels slot 8 FA');
    console.log(`   ID: ${jaydenSlot8Acq.id}`);
    console.log(`   droppedDate: 2025-11-25`);
  } else if (jaydenSlot8Acq?.droppedDate) {
    console.log('\n2. Jayden Daniels slot 8 FA already has droppedDate - no fix needed');
  } else {
    console.log('\n2. No slot 8 FA found for Jayden Daniels');
  }

  // === AFTER STATE ===
  console.log('\n=== AFTER STATE ===\n');

  // Jordan Love's acquisitions
  const jordanAcqsAfter = await db.playerAcquisition.findMany({
    where: { playerId: jordanLove.id },
    include: { team: true },
    orderBy: [{ seasonYear: 'asc' }, { acquisitionDate: 'asc' }]
  });

  console.log('Jordan Love acquisitions:');
  for (const acq of jordanAcqsAfter) {
    const acqDate = acq.acquisitionDate?.toISOString().split('T')[0] || 'null';
    const dropDate = acq.droppedDate?.toISOString().split('T')[0] || 'null';
    console.log(`  ${acq.seasonYear} | Slot ${acq.team.slotId} | ${acq.acquisitionType} | Acq: ${acqDate} | Drop: ${dropDate}`);
  }

  // Jayden Daniels' acquisitions
  const jaydenAcqsAfter = await db.playerAcquisition.findMany({
    where: { playerId: jaydenDaniels.id },
    include: { team: true },
    orderBy: [{ seasonYear: 'asc' }, { acquisitionDate: 'asc' }]
  });

  console.log('\nJayden Daniels acquisitions:');
  for (const acq of jaydenAcqsAfter) {
    const acqDate = acq.acquisitionDate?.toISOString().split('T')[0] || 'null';
    const dropDate = acq.droppedDate?.toISOString().split('T')[0] || 'null';
    console.log(`  ${acq.seasonYear} | Slot ${acq.team.slotId} | ${acq.acquisitionType} | Acq: ${acqDate} | Drop: ${dropDate}`);
  }

  // Verify slot 8 roster count
  const slot8Roster = await db.playerAcquisition.count({
    where: { teamId: slot8Team.id, seasonYear: 2025, droppedDate: null }
  });
  console.log(`\nSlot 8 roster count: ${slot8Roster}`);
}

fixTradeSlot8();
