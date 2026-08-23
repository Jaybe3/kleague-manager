import { describe, it, expect } from "vitest";
import {
  MAX_QB_KEEPERS,
  countingQbs,
  exemptQbs,
  getQbLimitStatus,
  isQb,
  qbLimitReachedError,
  qbLimitSubmitError,
  type QbCountable,
} from "./qb-limit";

function qb(playerName: string, isIrExempt = false): QbCountable {
  return { position: "QB", playerName, isIrExempt };
}

function rb(playerName: string): QbCountable {
  return { position: "RB", playerName, isIrExempt: false };
}

describe("isQb", () => {
  it("matches QB regardless of case", () => {
    expect(isQb("QB")).toBe(true);
    expect(isQb("qb")).toBe(true);
  });

  it("does not match other positions", () => {
    for (const pos of ["RB", "WR", "TE", "K", "LB", "DB", "DL"]) {
      expect(isQb(pos)).toBe(false);
    }
  });
});

describe("counting", () => {
  it("ignores non-quarterbacks", () => {
    const roster = [qb("Herbert"), rb("Bijan"), rb("Gibbs")];
    expect(countingQbs(roster)).toHaveLength(1);
  });

  it("excludes IR-exempt QBs from the count", () => {
    const roster = [qb("Herbert"), qb("Nix"), qb("Dart", true)];
    expect(countingQbs(roster).map((s) => s.playerName)).toEqual([
      "Herbert",
      "Nix",
    ]);
    expect(exemptQbs(roster).map((s) => s.playerName)).toEqual(["Dart"]);
  });
});

describe("getQbLimitStatus", () => {
  it("is not at the limit below three", () => {
    const status = getQbLimitStatus([qb("Herbert"), qb("Nix")]);
    expect(status.counted).toBe(2);
    expect(status.atLimit).toBe(false);
    expect(status.overLimit).toBe(false);
  });

  it("is at the limit at exactly three", () => {
    const status = getQbLimitStatus([qb("Herbert"), qb("Nix"), qb("Dart")]);
    expect(status.counted).toBe(3);
    expect(status.atLimit).toBe(true);
    expect(status.overLimit).toBe(false);
  });

  it("is over the limit at four counting QBs", () => {
    const status = getQbLimitStatus([
      qb("Herbert"),
      qb("Nix"),
      qb("Dart"),
      qb("Lawrence"),
    ]);
    expect(status.counted).toBe(4);
    expect(status.overLimit).toBe(true);
  });

  it("allows a fourth QB when one is IR-exempt", () => {
    const status = getQbLimitStatus([
      qb("Herbert"),
      qb("Nix"),
      qb("Dart"),
      qb("Lawrence", true),
    ]);
    expect(status.counted).toBe(3);
    expect(status.exempt).toBe(1);
    expect(status.atLimit).toBe(true);
    expect(status.overLimit).toBe(false);
  });

  it("allows five QBs with two IR-exempt", () => {
    const status = getQbLimitStatus([
      qb("Herbert"),
      qb("Nix"),
      qb("Dart"),
      qb("Lawrence", true),
      qb("Darnold", true),
    ]);
    expect(status.counted).toBe(3);
    expect(status.exempt).toBe(2);
    expect(status.overLimit).toBe(false);
  });

  it("reports the limit as three", () => {
    expect(getQbLimitStatus([]).limit).toBe(MAX_QB_KEEPERS);
    expect(MAX_QB_KEEPERS).toBe(3);
  });
});

describe("messages", () => {
  it("names the QBs already held when the limit is hit", () => {
    const msg = qbLimitReachedError([qb("Herbert"), qb("Nix"), qb("Dart")]);
    expect(msg).toContain("Herbert");
    expect(msg).toContain("Nix");
    expect(msg).toContain("Dart");
    expect(msg).toContain("3");
  });

  it("omits exempt QBs from the named list", () => {
    const msg = qbLimitReachedError([
      qb("Herbert"),
      qb("Nix"),
      qb("Dart"),
      qb("Darnold", true),
    ]);
    expect(msg).not.toContain("Darnold");
  });

  it("explains the submit block", () => {
    const msg = qbLimitSubmitError([
      qb("Herbert"),
      qb("Nix"),
      qb("Dart"),
      qb("Lawrence"),
    ]);
    expect(msg).toContain("Can't submit");
    expect(msg).toContain("Lawrence");
  });
});
