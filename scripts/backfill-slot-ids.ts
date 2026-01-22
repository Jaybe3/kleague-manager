/**
 * TASK-600b: Backfill slotId on PlayerAcquisition, KeeperSelection, KeeperOverride
 * Also creates DraftOrder records and moves managerId to TeamSlot
 *
 * This script is idempotent - safe to run multiple times.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== TASK-600b: Data Backfill ===\n");

  // Step 1: Backfill PlayerAcquisition.slotId
  console.log("Step 1: Backfilling PlayerAcquisition.slotId...");
  const acquisitions = await prisma.playerAcquisition.findMany({
    where: { slotId: null },
    include: { team: { select: { slotId: true } } },
  });

  let acqUpdated = 0;
  for (const acq of acquisitions) {
    await prisma.playerAcquisition.update({
      where: { id: acq.id },
      data: { slotId: acq.team.slotId },
    });
    acqUpdated++;
  }
  console.log(`  Updated ${acqUpdated} PlayerAcquisition records`);

  // Step 2: Backfill KeeperSelection.slotId
  console.log("\nStep 2: Backfilling KeeperSelection.slotId...");
  const keepers = await prisma.keeperSelection.findMany({
    where: { slotId: null },
    include: { team: { select: { slotId: true } } },
  });

  let keeperUpdated = 0;
  for (const keeper of keepers) {
    await prisma.keeperSelection.update({
      where: { id: keeper.id },
      data: { slotId: keeper.team.slotId },
    });
    keeperUpdated++;
  }
  console.log(`  Updated ${keeperUpdated} KeeperSelection records`);

  // Step 3: Backfill KeeperOverride.slotId
  console.log("\nStep 3: Backfilling KeeperOverride.slotId...");
  const overrides = await prisma.keeperOverride.findMany({
    where: { slotId: null },
    include: { team: { select: { slotId: true } } },
  });

  let overrideUpdated = 0;
  for (const override of overrides) {
    await prisma.keeperOverride.update({
      where: { id: override.id },
      data: { slotId: override.team.slotId },
    });
    overrideUpdated++;
  }
  console.log(`  Updated ${overrideUpdated} KeeperOverride records`);

  // Step 4: Create DraftOrder records from Team.draftPosition
  console.log("\nStep 4: Creating DraftOrder records...");
  const teams = await prisma.team.findMany({
    select: { slotId: true, seasonYear: true, draftPosition: true },
  });

  let draftOrderCreated = 0;
  let draftOrderSkipped = 0;
  for (const team of teams) {
    // Use upsert for idempotency
    const result = await prisma.draftOrder.upsert({
      where: {
        slotId_seasonYear: {
          slotId: team.slotId,
          seasonYear: team.seasonYear,
        },
      },
      create: {
        slotId: team.slotId,
        seasonYear: team.seasonYear,
        position: team.draftPosition,
      },
      update: {
        position: team.draftPosition,
      },
    });

    // Check if this was a create or update by comparing timestamps
    const isNew = result.createdAt.getTime() === result.updatedAt.getTime();
    if (isNew) {
      draftOrderCreated++;
    } else {
      draftOrderSkipped++;
    }
  }
  console.log(`  Created ${draftOrderCreated} DraftOrder records`);
  if (draftOrderSkipped > 0) {
    console.log(`  Skipped ${draftOrderSkipped} (already existed)`);
  }

  // Step 5: Move managerId from Team to TeamSlot
  console.log("\nStep 5: Moving managerId to TeamSlot...");
  // Find teams with managerId set, ordered by seasonYear DESC to get most recent first
  const teamsWithManager = await prisma.team.findMany({
    where: { managerId: { not: null } },
    orderBy: { seasonYear: "desc" },
    select: { slotId: true, managerId: true, seasonYear: true },
  });

  // Group by slotId, keeping only the most recent (first due to DESC order)
  const slotManagerMap = new Map<number, string>();
  for (const team of teamsWithManager) {
    if (!slotManagerMap.has(team.slotId) && team.managerId) {
      slotManagerMap.set(team.slotId, team.managerId);
    }
  }

  let slotUpdated = 0;
  for (const [slotId, managerId] of slotManagerMap) {
    const slot = await prisma.teamSlot.findUnique({ where: { id: slotId } });
    if (slot && slot.managerId !== managerId) {
      await prisma.teamSlot.update({
        where: { id: slotId },
        data: { managerId },
      });
      slotUpdated++;
      console.log(`  Set TeamSlot ${slotId} managerId to ${managerId}`);
    }
  }
  if (slotUpdated === 0) {
    console.log(`  No TeamSlot updates needed (already set or no managers)`);
  }

  // Final Summary
  console.log("\n=== Backfill Complete ===");

  const finalAcqNull = await prisma.playerAcquisition.count({ where: { slotId: null } });
  const finalAcqTotal = await prisma.playerAcquisition.count();
  console.log(`PlayerAcquisition: ${finalAcqTotal - finalAcqNull}/${finalAcqTotal} have slotId (${finalAcqNull} null)`);

  const finalKeeperNull = await prisma.keeperSelection.count({ where: { slotId: null } });
  const finalKeeperTotal = await prisma.keeperSelection.count();
  console.log(`KeeperSelection: ${finalKeeperTotal - finalKeeperNull}/${finalKeeperTotal} have slotId (${finalKeeperNull} null)`);

  const finalOverrideNull = await prisma.keeperOverride.count({ where: { slotId: null } });
  const finalOverrideTotal = await prisma.keeperOverride.count();
  console.log(`KeeperOverride: ${finalOverrideTotal - finalOverrideNull}/${finalOverrideTotal} have slotId (${finalOverrideNull} null)`);

  const finalDraftOrderCount = await prisma.draftOrder.count();
  console.log(`DraftOrder: ${finalDraftOrderCount} records`);

  const slot10 = await prisma.teamSlot.findUnique({ where: { id: 10 } });
  console.log(`TeamSlot 10 managerId: ${slot10?.managerId ?? "null"}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("Error during backfill:", e);
  await prisma.$disconnect();
  process.exit(1);
});
