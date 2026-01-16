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
});
