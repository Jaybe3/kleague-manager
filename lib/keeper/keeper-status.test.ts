import { describe, it, expect } from "vitest";
import {
  KEEPER_STATUS_RANK,
  resolveKeeperStatus,
  type KeeperStatusInput,
} from "./keeper-status";

function input(overrides: Partial<KeeperStatusInput> = {}): KeeperStatusInput {
  return {
    selection: null,
    isEligible: true,
    teamHasSubmitted: false,
    deadlinePassed: false,
    ...overrides,
  };
}

describe("resolveKeeperStatus", () => {
  it("is KEPT when a selection counts", () => {
    expect(
      resolveKeeperStatus(input({ selection: { keeperRound: 3 } }))
    ).toBe("KEPT");
  });

  it("is KEPT even for a player the calculator called ineligible", () => {
    // A commissioner override can put a player on a list the calculator
    // wouldn't have allowed.
    expect(
      resolveKeeperStatus(
        input({ selection: { keeperRound: 1 }, isEligible: false })
      )
    ).toBe("KEPT");
  });

  it("is INELIGIBLE when the player can't be kept at all", () => {
    expect(resolveKeeperStatus(input({ isEligible: false }))).toBe("INELIGIBLE");
  });

  it("is INELIGIBLE regardless of submission or deadline state", () => {
    for (const teamHasSubmitted of [false, true]) {
      for (const deadlinePassed of [false, true]) {
        expect(
          resolveKeeperStatus(
            input({ isEligible: false, teamHasSubmitted, deadlinePassed })
          )
        ).toBe("INELIGIBLE");
      }
    }
  });

  it("is PENDING while the owner hasn't submitted and the deadline is open", () => {
    expect(resolveKeeperStatus(input())).toBe("PENDING");
  });

  it("is NOT_KEPT once the owner submits without him", () => {
    expect(resolveKeeperStatus(input({ teamHasSubmitted: true }))).toBe(
      "NOT_KEPT"
    );
  });

  it("is NOT_KEPT after the deadline even if the team never submitted", () => {
    // The deadline is the lock - an unsubmitted roster is still final.
    expect(resolveKeeperStatus(input({ deadlinePassed: true }))).toBe(
      "NOT_KEPT"
    );
  });

  it("never reports PENDING after the deadline", () => {
    for (const isEligible of [false, true]) {
      for (const teamHasSubmitted of [false, true]) {
        expect(
          resolveKeeperStatus(
            input({ isEligible, teamHasSubmitted, deadlinePassed: true })
          )
        ).not.toBe("PENDING");
      }
    }
  });
});

describe("KEEPER_STATUS_RANK", () => {
  it("sorts kept first, then pending, then the settled noes", () => {
    const order = (["INELIGIBLE", "NOT_KEPT", "KEPT", "PENDING"] as const)
      .slice()
      .sort((a, b) => KEEPER_STATUS_RANK[a] - KEEPER_STATUS_RANK[b]);

    expect(order).toEqual(["KEPT", "PENDING", "NOT_KEPT", "INELIGIBLE"]);
  });
});
