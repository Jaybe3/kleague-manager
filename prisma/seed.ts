import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const leagueRules = [
  // 2023 Founding Rules
  {
    code: "KEEPER_COST_YEAR_2",
    name: "Year 2 Base Cost",
    description:
      "First keeper year: keep at original draft round (or Round 15 for FA). This is the base cost before any reductions apply.",
    effectiveSeason: 2023,
    enabled: true,
  },
  {
    code: "KEEPER_COST_YEAR_3_PLUS",
    name: "Year 3+ Reduction",
    description:
      "Second+ keeper year: cost reduces by 4 rounds per year. Example: Round 10 player costs R10 in Year 2, R6 in Year 3, R2 in Year 4.",
    effectiveSeason: 2023,
    enabled: true,
  },
  {
    code: "KEEPER_INELIGIBILITY",
    name: "Keeper Ineligibility",
    description:
      "Player becomes ineligible to be kept when their calculated keeper cost would be less than Round 1. They must be released back into the draft pool.",
    effectiveSeason: 2023,
    enabled: true,
  },
  {
    code: "TRUE_FA_ROUND_15",
    name: "True FA Round 15",
    description:
      "Players who were never drafted by any team use Round 15 as their keeper base cost. This applies to true undrafted free agents only.",
    effectiveSeason: 2023,
    enabled: true,
  },
  {
    code: "TRADE_INHERITS_COST",
    name: "Trade Inherits Cost",
    description:
      "Traded players retain their original draft year and round for keeper cost calculation. The keeper clock continues from when they were originally drafted.",
    effectiveSeason: 2023,
    enabled: true,
  },

  // 2025 New Rules
  {
    code: "FA_INHERITS_DRAFT_ROUND",
    name: "FA Inherits Draft Round",
    description:
      "If you pick up a player as a free agent who was drafted by another team the same season (then dropped), you inherit their original draft round for keeper calculations.",
    effectiveSeason: 2025,
    enabled: true,
  },
  {
    code: "KEEPER_ROUND_BUMP",
    name: "Keeper Round Bump",
    description:
      "When two keepers have the same calculated round, one must be bumped to an earlier (more expensive) round. You cannot keep two players at the same round.",
    effectiveSeason: 2025,
    enabled: true,
  },
];

async function main() {
  console.log("Seeding league rules...");

  for (const rule of leagueRules) {
    const existing = await prisma.leagueRule.findUnique({
      where: { code: rule.code },
    });

    if (existing) {
      console.log(`  Rule "${rule.code}" already exists, skipping.`);
    } else {
      await prisma.leagueRule.create({ data: rule });
      console.log(`  Created rule: ${rule.code}`);
    }
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
