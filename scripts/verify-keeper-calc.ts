/**
 * Verification script for keeper cost calculator
 * Run with: npx tsx scripts/verify-keeper-calc.ts
 */

import { calculateKeeperCost } from "../lib/keeper/calculator";

interface TestCase {
  name: string;
  input: {
    acquisitionType: "DRAFT" | "FA";
    originalDraftRound: number | null;
    acquisitionYear: number;
    targetYear: number;
  };
  expected: {
    yearsKept: number;
    keeperRound: number | null;
    isEligible: boolean;
  };
}

const testCases: TestCase[] = [
  // ========== DRAFTED PLAYER TESTS ==========
  {
    name: "D1: Draft R6, Year 1",
    input: { acquisitionType: "DRAFT", originalDraftRound: 6, acquisitionYear: 2024, targetYear: 2025 },
    expected: { yearsKept: 1, keeperRound: 6, isEligible: true },
  },
  {
    name: "D2: Draft R6, Year 2",
    input: { acquisitionType: "DRAFT", originalDraftRound: 6, acquisitionYear: 2024, targetYear: 2026 },
    expected: { yearsKept: 2, keeperRound: 6, isEligible: true },
  },
  {
    name: "D3: Draft R6, Year 3",
    input: { acquisitionType: "DRAFT", originalDraftRound: 6, acquisitionYear: 2024, targetYear: 2027 },
    expected: { yearsKept: 3, keeperRound: 2, isEligible: true },
  },
  {
    name: "D4: Draft R6, Year 4 - INELIGIBLE",
    input: { acquisitionType: "DRAFT", originalDraftRound: 6, acquisitionYear: 2024, targetYear: 2028 },
    expected: { yearsKept: 4, keeperRound: null, isEligible: false },
  },
  {
    name: "D5: Draft R10, Year 1",
    input: { acquisitionType: "DRAFT", originalDraftRound: 10, acquisitionYear: 2024, targetYear: 2025 },
    expected: { yearsKept: 1, keeperRound: 10, isEligible: true },
  },
  {
    name: "D6: Draft R10, Year 2",
    input: { acquisitionType: "DRAFT", originalDraftRound: 10, acquisitionYear: 2024, targetYear: 2026 },
    expected: { yearsKept: 2, keeperRound: 10, isEligible: true },
  },
  {
    name: "D7: Draft R10, Year 3",
    input: { acquisitionType: "DRAFT", originalDraftRound: 10, acquisitionYear: 2024, targetYear: 2027 },
    expected: { yearsKept: 3, keeperRound: 6, isEligible: true },
  },
  {
    name: "D8: Draft R10, Year 4",
    input: { acquisitionType: "DRAFT", originalDraftRound: 10, acquisitionYear: 2024, targetYear: 2028 },
    expected: { yearsKept: 4, keeperRound: 2, isEligible: true },
  },
  {
    name: "D9: Draft R10, Year 5 - INELIGIBLE",
    input: { acquisitionType: "DRAFT", originalDraftRound: 10, acquisitionYear: 2024, targetYear: 2029 },
    expected: { yearsKept: 5, keeperRound: null, isEligible: false },
  },

  // ========== EDGE CASES - LOW DRAFT ROUNDS ==========
  {
    name: "E1: Draft R1, Year 1",
    input: { acquisitionType: "DRAFT", originalDraftRound: 1, acquisitionYear: 2024, targetYear: 2025 },
    expected: { yearsKept: 1, keeperRound: 1, isEligible: true },
  },
  {
    name: "E2: Draft R1, Year 2",
    input: { acquisitionType: "DRAFT", originalDraftRound: 1, acquisitionYear: 2024, targetYear: 2026 },
    expected: { yearsKept: 2, keeperRound: 1, isEligible: true },
  },
  {
    name: "E3: Draft R1, Year 3 - INELIGIBLE",
    input: { acquisitionType: "DRAFT", originalDraftRound: 1, acquisitionYear: 2024, targetYear: 2027 },
    expected: { yearsKept: 3, keeperRound: null, isEligible: false },
  },
  {
    name: "E6: Draft R4, Year 3 - INELIGIBLE (4-4=0)",
    input: { acquisitionType: "DRAFT", originalDraftRound: 4, acquisitionYear: 2024, targetYear: 2027 },
    expected: { yearsKept: 3, keeperRound: null, isEligible: false },
  },
  {
    name: "E7: Draft R5, Year 3",
    input: { acquisitionType: "DRAFT", originalDraftRound: 5, acquisitionYear: 2024, targetYear: 2027 },
    expected: { yearsKept: 3, keeperRound: 1, isEligible: true },
  },
  {
    name: "E8: Draft R5, Year 4 - INELIGIBLE",
    input: { acquisitionType: "DRAFT", originalDraftRound: 5, acquisitionYear: 2024, targetYear: 2028 },
    expected: { yearsKept: 4, keeperRound: null, isEligible: false },
  },

  // ========== FREE AGENT TESTS ==========
  {
    name: "FA1: FA, Year 1",
    input: { acquisitionType: "FA", originalDraftRound: null, acquisitionYear: 2024, targetYear: 2025 },
    expected: { yearsKept: 1, keeperRound: 15, isEligible: true },
  },
  {
    name: "FA2: FA, Year 2",
    input: { acquisitionType: "FA", originalDraftRound: null, acquisitionYear: 2024, targetYear: 2026 },
    expected: { yearsKept: 2, keeperRound: 15, isEligible: true },
  },
  {
    name: "FA3: FA, Year 3",
    input: { acquisitionType: "FA", originalDraftRound: null, acquisitionYear: 2024, targetYear: 2027 },
    expected: { yearsKept: 3, keeperRound: 11, isEligible: true },
  },
  {
    name: "FA4: FA, Year 4",
    input: { acquisitionType: "FA", originalDraftRound: null, acquisitionYear: 2024, targetYear: 2028 },
    expected: { yearsKept: 4, keeperRound: 7, isEligible: true },
  },
  {
    name: "FA5: FA, Year 5",
    input: { acquisitionType: "FA", originalDraftRound: null, acquisitionYear: 2024, targetYear: 2029 },
    expected: { yearsKept: 5, keeperRound: 3, isEligible: true },
  },
  {
    name: "FA6: FA, Year 6 - INELIGIBLE",
    input: { acquisitionType: "FA", originalDraftRound: null, acquisitionYear: 2024, targetYear: 2030 },
    expected: { yearsKept: 6, keeperRound: null, isEligible: false },
  },

  // ========== MULTI-YEAR PROGRESSION TESTS ==========
  {
    name: "Progression: R12, Year 3",
    input: { acquisitionType: "DRAFT", originalDraftRound: 12, acquisitionYear: 2022, targetYear: 2025 },
    expected: { yearsKept: 3, keeperRound: 8, isEligible: true },
  },
  {
    name: "Progression: R12, Year 4",
    input: { acquisitionType: "DRAFT", originalDraftRound: 12, acquisitionYear: 2022, targetYear: 2026 },
    expected: { yearsKept: 4, keeperRound: 4, isEligible: true },
  },
  {
    name: "Progression: R12, Year 5 - INELIGIBLE",
    input: { acquisitionType: "DRAFT", originalDraftRound: 12, acquisitionYear: 2022, targetYear: 2027 },
    expected: { yearsKept: 5, keeperRound: null, isEligible: false },
  },

  // ========== TRADE TESTS (same calc as original acquisition) ==========
  {
    name: "T1: Traded player (orig Draft R8 in 2023), Year 2025",
    input: { acquisitionType: "DRAFT", originalDraftRound: 8, acquisitionYear: 2023, targetYear: 2025 },
    expected: { yearsKept: 2, keeperRound: 8, isEligible: true },
  },
  {
    name: "T2: Traded player (orig Draft R8 in 2023), Year 2026",
    input: { acquisitionType: "DRAFT", originalDraftRound: 8, acquisitionYear: 2023, targetYear: 2026 },
    expected: { yearsKept: 3, keeperRound: 4, isEligible: true },
  },
  {
    name: "T3: Traded FA (orig FA in 2023), Year 2025",
    input: { acquisitionType: "FA", originalDraftRound: null, acquisitionYear: 2023, targetYear: 2025 },
    expected: { yearsKept: 2, keeperRound: 15, isEligible: true },
  },
  {
    name: "T4: Traded FA (orig FA in 2023), Year 2026",
    input: { acquisitionType: "FA", originalDraftRound: null, acquisitionYear: 2023, targetYear: 2026 },
    expected: { yearsKept: 3, keeperRound: 11, isEligible: true },
  },
];

// Run tests
console.log("=".repeat(60));
console.log("KEEPER COST CALCULATOR VERIFICATION");
console.log("=".repeat(60));
console.log("");

let passed = 0;
let failed = 0;

for (const test of testCases) {
  const result = calculateKeeperCost(test.input);

  const yearsMatch = result.yearsKept === test.expected.yearsKept;
  const roundMatch = result.keeperRound === test.expected.keeperRound;
  const eligibleMatch = result.isEligible === test.expected.isEligible;

  const allMatch = yearsMatch && roundMatch && eligibleMatch;

  if (allMatch) {
    console.log(`✓ ${test.name}`);
    passed++;
  } else {
    console.log(`✗ ${test.name}`);
    console.log(`  Expected: yearsKept=${test.expected.yearsKept}, keeperRound=${test.expected.keeperRound}, isEligible=${test.expected.isEligible}`);
    console.log(`  Actual:   yearsKept=${result.yearsKept}, keeperRound=${result.keeperRound}, isEligible=${result.isEligible}`);
    if (!yearsMatch) console.log(`  MISMATCH: yearsKept`);
    if (!roundMatch) console.log(`  MISMATCH: keeperRound`);
    if (!eligibleMatch) console.log(`  MISMATCH: isEligible`);
    failed++;
  }
}

console.log("");
console.log("=".repeat(60));
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log("=".repeat(60));

if (failed > 0) {
  process.exit(1);
}
