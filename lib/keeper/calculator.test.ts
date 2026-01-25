import { describe, it, expect } from "vitest";
import {
  calculateKeeperCost,
  calculateKeeperProgression,
  getLastEligibleYear,
  canBeKept,
  getKeeperRound,
} from "./calculator";
import type { KeeperCalculationInput } from "./types";

describe("Keeper Cost Calculator", () => {
  // ====================
  // CRITICAL TEST CASES FROM TASKS.md
  // ====================

  describe("Drafted Player - Round 6 (CRITICAL)", () => {
    const baseInput: Omit<KeeperCalculationInput, "targetYear"> = {
      acquisitionType: "DRAFT",
      originalDraftRound: 6,
      acquisitionYear: 2024,
    };

    it("Y2 (2025): Keep at R6 - same as drafted", () => {
      const result = calculateKeeperCost({ ...baseInput, targetYear: 2025 });
      expect(result.isEligible).toBe(true);
      expect(result.keeperRound).toBe(6);
      expect(result.yearsKept).toBe(1);
      expect(result.costReduction).toBe(0);
    });

    it("Y3 (2026): Keep at R2 - first -4 reduction", () => {
      const result = calculateKeeperCost({ ...baseInput, targetYear: 2026 });
      expect(result.isEligible).toBe(true);
      expect(result.keeperRound).toBe(2);
      expect(result.yearsKept).toBe(2);
      expect(result.costReduction).toBe(4);
    });

    it("Y4 (2027): INELIGIBLE - would be R-2 (less than R1)", () => {
      const result = calculateKeeperCost({ ...baseInput, targetYear: 2027 });
      expect(result.isEligible).toBe(false);
      expect(result.keeperRound).toBe(null);
      expect(result.yearsKept).toBe(3);
      expect(result.costReduction).toBe(8);
    });
  });

  describe("Free Agent (CRITICAL)", () => {
    const baseInput: Omit<KeeperCalculationInput, "targetYear"> = {
      acquisitionType: "FA",
      originalDraftRound: null,
      acquisitionYear: 2024,
    };

    it("Y2 (2025): Keep at R15 - FA base cost", () => {
      const result = calculateKeeperCost({ ...baseInput, targetYear: 2025 });
      expect(result.isEligible).toBe(true);
      expect(result.keeperRound).toBe(15);
      expect(result.yearsKept).toBe(1);
      expect(result.baseRound).toBe(15);
    });

    it("Y3 (2026): Keep at R11 - first -4 reduction", () => {
      const result = calculateKeeperCost({ ...baseInput, targetYear: 2026 });
      expect(result.isEligible).toBe(true);
      expect(result.keeperRound).toBe(11);
      expect(result.yearsKept).toBe(2);
      expect(result.costReduction).toBe(4);
    });

    it("Y4 (2027): Keep at R7 - second -4 reduction", () => {
      const result = calculateKeeperCost({ ...baseInput, targetYear: 2027 });
      expect(result.isEligible).toBe(true);
      expect(result.keeperRound).toBe(7);
      expect(result.yearsKept).toBe(3);
      expect(result.costReduction).toBe(8);
    });
  });

  // ====================
  // ADDITIONAL TEST CASES
  // ====================

  describe("Drafted Player - Round 3 (early ineligibility)", () => {
    const baseInput: Omit<KeeperCalculationInput, "targetYear"> = {
      acquisitionType: "DRAFT",
      originalDraftRound: 3,
      acquisitionYear: 2024,
    };

    it("Y2 (2025): Keep at R3", () => {
      const result = calculateKeeperCost({ ...baseInput, targetYear: 2025 });
      expect(result.isEligible).toBe(true);
      expect(result.keeperRound).toBe(3);
    });

    it("Y3 (2026): INELIGIBLE - would be R-1", () => {
      const result = calculateKeeperCost({ ...baseInput, targetYear: 2026 });
      expect(result.isEligible).toBe(false);
      expect(result.keeperRound).toBe(null);
      expect(result.costReduction).toBe(4);
    });
  });

  describe("Drafted Player - Round 10 (long eligibility)", () => {
    const baseInput: Omit<KeeperCalculationInput, "targetYear"> = {
      acquisitionType: "DRAFT",
      originalDraftRound: 10,
      acquisitionYear: 2024,
    };

    it("Y2 (2025): Keep at R10", () => {
      const result = calculateKeeperCost({ ...baseInput, targetYear: 2025 });
      expect(result.isEligible).toBe(true);
      expect(result.keeperRound).toBe(10);
    });

    it("Y3 (2026): Keep at R6 - first -4 reduction", () => {
      const result = calculateKeeperCost({ ...baseInput, targetYear: 2026 });
      expect(result.isEligible).toBe(true);
      expect(result.keeperRound).toBe(6);
      expect(result.costReduction).toBe(4);
    });

    it("Y4 (2027): Keep at R2 - second -4 reduction", () => {
      const result = calculateKeeperCost({ ...baseInput, targetYear: 2027 });
      expect(result.isEligible).toBe(true);
      expect(result.keeperRound).toBe(2);
      expect(result.costReduction).toBe(8);
    });

    it("Y5 (2028): INELIGIBLE - would be R-2", () => {
      const result = calculateKeeperCost({ ...baseInput, targetYear: 2028 });
      expect(result.isEligible).toBe(false);
      expect(result.keeperRound).toBe(null);
      expect(result.costReduction).toBe(12);
    });
  });

  describe("Free Agent - long eligibility progression", () => {
    const baseInput: Omit<KeeperCalculationInput, "targetYear"> = {
      acquisitionType: "FA",
      originalDraftRound: null,
      acquisitionYear: 2024,
    };

    it("Y5 (2028): Keep at R3", () => {
      const result = calculateKeeperCost({ ...baseInput, targetYear: 2028 });
      expect(result.isEligible).toBe(true);
      expect(result.keeperRound).toBe(3);
      expect(result.costReduction).toBe(12);
    });

    it("Y6 (2029): INELIGIBLE - would be R-1", () => {
      const result = calculateKeeperCost({ ...baseInput, targetYear: 2029 });
      expect(result.isEligible).toBe(false);
      expect(result.keeperRound).toBe(null);
      expect(result.costReduction).toBe(16);
    });
  });

  // ====================
  // EDGE CASES
  // ====================

  describe("Edge Cases", () => {
    it("target year same as acquisition year should be ineligible", () => {
      const result = calculateKeeperCost({
        acquisitionType: "DRAFT",
        originalDraftRound: 10,
        acquisitionYear: 2024,
        targetYear: 2024,
      });
      expect(result.isEligible).toBe(false);
      expect(result.yearsKept).toBe(0);
    });

    it("target year before acquisition year should be ineligible", () => {
      const result = calculateKeeperCost({
        acquisitionType: "DRAFT",
        originalDraftRound: 10,
        acquisitionYear: 2024,
        targetYear: 2023,
      });
      expect(result.isEligible).toBe(false);
    });

    it("Round 1 drafted player: eligible Y2 only, ineligible Y3", () => {
      const result1 = calculateKeeperCost({
        acquisitionType: "DRAFT",
        originalDraftRound: 1,
        acquisitionYear: 2024,
        targetYear: 2025,
      });
      expect(result1.isEligible).toBe(true);
      expect(result1.keeperRound).toBe(1);

      const result2 = calculateKeeperCost({
        acquisitionType: "DRAFT",
        originalDraftRound: 1,
        acquisitionYear: 2024,
        targetYear: 2026,
      });
      expect(result2.isEligible).toBe(false);
      expect(result2.keeperRound).toBe(null);
    });

    it("Round 28 drafted player has longest eligibility", () => {
      // Y8 (2031): 28 - 4*(7-1) = 28-24 = R4, still eligible
      const result = calculateKeeperCost({
        acquisitionType: "DRAFT",
        originalDraftRound: 28,
        acquisitionYear: 2024,
        targetYear: 2031, // Year 8
      });
      expect(result.isEligible).toBe(true);
      expect(result.keeperRound).toBe(4);

      // Y9 (2032): 28 - 4*(8-1) = 28-28 = 0 < 1, INELIGIBLE
      const result2 = calculateKeeperCost({
        acquisitionType: "DRAFT",
        originalDraftRound: 28,
        acquisitionYear: 2024,
        targetYear: 2032, // Year 9
      });
      expect(result2.isEligible).toBe(false);
    });
  });

  // ====================
  // HELPER FUNCTIONS
  // ====================

  describe("calculateKeeperProgression", () => {
    it("returns progression for drafted player", () => {
      const results = calculateKeeperProgression(
        {
          acquisitionType: "DRAFT",
          originalDraftRound: 6,
          acquisitionYear: 2024,
        },
        2025,
        2027
      );

      expect(results).toHaveLength(3);
      expect(results[0].keeperRound).toBe(6);  // Y2: base
      expect(results[1].keeperRound).toBe(2);  // Y3: -4
      expect(results[2].isEligible).toBe(false); // Y4: ineligible
    });
  });

  describe("getLastEligibleYear", () => {
    it("returns correct last year for Round 6 draft", () => {
      const lastYear = getLastEligibleYear({
        acquisitionType: "DRAFT",
        originalDraftRound: 6,
        acquisitionYear: 2024,
      });
      // Y2: R6, Y3: R2, Y4: ineligible -> last year is 2026 (Y3)
      expect(lastYear).toBe(2026);
    });

    it("returns correct last year for FA", () => {
      const lastYear = getLastEligibleYear({
        acquisitionType: "FA",
        originalDraftRound: null,
        acquisitionYear: 2024,
      });
      // FA at R15: Y2=R15, Y3=R11, Y4=R7, Y5=R3, Y6=ineligible -> last year is 2028 (Y5)
      expect(lastYear).toBe(2028);
    });
  });

  describe("canBeKept and getKeeperRound", () => {
    it("canBeKept returns boolean", () => {
      expect(
        canBeKept({
          acquisitionType: "DRAFT",
          originalDraftRound: 6,
          acquisitionYear: 2024,
          targetYear: 2025,
        })
      ).toBe(true);

      expect(
        canBeKept({
          acquisitionType: "DRAFT",
          originalDraftRound: 6,
          acquisitionYear: 2024,
          targetYear: 2027, // Y4: ineligible
        })
      ).toBe(false);
    });

    it("getKeeperRound returns round or null", () => {
      expect(
        getKeeperRound({
          acquisitionType: "DRAFT",
          originalDraftRound: 6,
          acquisitionYear: 2024,
          targetYear: 2025,
        })
      ).toBe(6);

      expect(
        getKeeperRound({
          acquisitionType: "DRAFT",
          originalDraftRound: 6,
          acquisitionYear: 2024,
          targetYear: 2027, // Y4: ineligible
        })
      ).toBe(null);
    });
  });

  // ====================
  // CHAIN BREAK SCENARIOS (TASK-601)
  // ====================
  // These tests document the expected calculation behavior when chain breaks are detected.
  // The actual chain break detection happens in service.ts (findKeeperBaseAcquisition).
  // These tests verify the calculator produces correct results given the correct base.

  describe("Chain Break Scenarios (TASK-601)", () => {
    describe("Danielle Hunter Example - Chain Broken", () => {
      // Real data: 2023 DRAFT R19, 2024 DRAFT R19 (kept), 2025 FA (NOT kept)
      // Chain is broken at 2025 FA - should use 2025 FA as base (R15)

      it("2026 cost should be R15 (clean slate from 2025 FA)", () => {
        // When chain is broken, service returns 2025 FA as base
        // Calculator sees: FA acquired 2025, target 2026
        const result = calculateKeeperCost({
          acquisitionType: "FA",
          originalDraftRound: null,
          acquisitionYear: 2025,
          targetYear: 2026,
        });
        expect(result.isEligible).toBe(true);
        expect(result.keeperRound).toBe(15); // Y2: FA base cost
        expect(result.yearsKept).toBe(1);
      });

      it("2027 cost should be R11 (Y3 from 2025 FA)", () => {
        const result = calculateKeeperCost({
          acquisitionType: "FA",
          originalDraftRound: null,
          acquisitionYear: 2025,
          targetYear: 2027,
        });
        expect(result.isEligible).toBe(true);
        expect(result.keeperRound).toBe(11); // Y3: 15 - 4 = 11
        expect(result.yearsKept).toBe(2);
      });
    });

    describe("Continuous Keeper - No Chain Break", () => {
      // Example: 2023 DRAFT R10, 2024 DRAFT R10, 2025 DRAFT R10 (kept all years)
      // Chain is continuous - should use 2023 DRAFT as base

      it("2026 cost should be R2 (Year 4 from 2023 DRAFT)", () => {
        // When chain is continuous, service returns 2023 DRAFT as base
        // Calculator sees: DRAFT R10 acquired 2023, target 2026
        const result = calculateKeeperCost({
          acquisitionType: "DRAFT",
          originalDraftRound: 10,
          acquisitionYear: 2023,
          targetYear: 2026,
        });
        expect(result.isEligible).toBe(true);
        expect(result.keeperRound).toBe(2); // Y4: 10 - 8 = 2
        expect(result.yearsKept).toBe(3);
        expect(result.costReduction).toBe(8);
      });

      it("2027 should be INELIGIBLE (Year 5 from 2023 DRAFT)", () => {
        const result = calculateKeeperCost({
          acquisitionType: "DRAFT",
          originalDraftRound: 10,
          acquisitionYear: 2023,
          targetYear: 2027,
        });
        expect(result.isEligible).toBe(false);
        expect(result.keeperRound).toBe(null); // Y5: 10 - 12 = -2 < 1
        expect(result.yearsKept).toBe(4);
      });
    });

    describe("Chain Broken - Player Dropped Then Re-acquired as FA", () => {
      // Example: 2024 DRAFT R8 (dropped mid-season), 2025 FA
      // Chain broken - 2025 FA is clean slate

      it("2026 cost should be R15 (clean slate from 2025 FA)", () => {
        const result = calculateKeeperCost({
          acquisitionType: "FA",
          originalDraftRound: null,
          acquisitionYear: 2025,
          targetYear: 2026,
        });
        expect(result.isEligible).toBe(true);
        expect(result.keeperRound).toBe(15);
      });
    });

    describe("Trade Preserves History", () => {
      // Example: 2023 DRAFT R9 on Slot 3, traded to Slot 10 in 2024
      // Trade preserves history - use 2023 DRAFT R9 as base

      it("2026 cost should be R1 (Year 4 from 2023 DRAFT R9)", () => {
        // Trade doesn't reset clock - service finds original DRAFT
        // Y2: R9, Y3: R9-4=R5, Y4: R9-8=R1
        const result = calculateKeeperCost({
          acquisitionType: "DRAFT",
          originalDraftRound: 9,
          acquisitionYear: 2023,
          targetYear: 2026,
        });
        expect(result.isEligible).toBe(true);
        expect(result.keeperRound).toBe(1); // Y4: 9 - 8 = 1 (still eligible!)
        expect(result.yearsKept).toBe(3);
        expect(result.costReduction).toBe(8);
      });

      it("2027 should be INELIGIBLE", () => {
        const result = calculateKeeperCost({
          acquisitionType: "DRAFT",
          originalDraftRound: 9,
          acquisitionYear: 2023,
          targetYear: 2027,
        });
        expect(result.isEligible).toBe(false);
        expect(result.keeperRound).toBe(null); // Y5: 9 - 12 = -3 < 1
      });
    });

    describe("FA Same Season as Draft (Inherits Draft Round)", () => {
      // Example: Player drafted R12 by Slot 2 in 2025, dropped, picked up as FA by Slot 10
      // FA inherits the same-season draft round

      it("2026 cost should be R12 (inherits same-season draft)", () => {
        // Service finds the same-season DRAFT and returns it as base
        const result = calculateKeeperCost({
          acquisitionType: "DRAFT",
          originalDraftRound: 12,
          acquisitionYear: 2025,
          targetYear: 2026,
        });
        expect(result.isEligible).toBe(true);
        expect(result.keeperRound).toBe(12); // Y2: base draft round
        expect(result.yearsKept).toBe(1);
      });
    });

    describe("True FA (Never Drafted)", () => {
      // Example: Player signed as FA in 2025, was never drafted by anyone

      it("2026 cost should be R15 (true FA base)", () => {
        const result = calculateKeeperCost({
          acquisitionType: "FA",
          originalDraftRound: null,
          acquisitionYear: 2025,
          targetYear: 2026,
        });
        expect(result.isEligible).toBe(true);
        expect(result.keeperRound).toBe(15);
      });
    });

    describe("Fresh Draft Year 2", () => {
      // Example: Player drafted R7 in 2025, first year keeping

      it("2026 cost should be R7 (Year 2 base cost)", () => {
        const result = calculateKeeperCost({
          acquisitionType: "DRAFT",
          originalDraftRound: 7,
          acquisitionYear: 2025,
          targetYear: 2026,
        });
        expect(result.isEligible).toBe(true);
        expect(result.keeperRound).toBe(7); // Y2: base cost
        expect(result.yearsKept).toBe(1);
        expect(result.costReduction).toBe(0);
      });
    });
  });
});
