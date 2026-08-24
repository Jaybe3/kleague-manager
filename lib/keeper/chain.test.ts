import { describe, it, expect } from "vitest";
import {
  findChainStartYear,
  findTradeSource,
  resolveTradeBase,
  type ChainAcquisition,
} from "./chain";

interface Acq extends ChainAcquisition {
  label: string;
}

function draft(
  label: string,
  slotId: number,
  seasonYear: number,
  acquired: string,
  dropped: string | null = null
): Acq {
  return {
    label,
    slotId,
    seasonYear,
    acquisitionType: "DRAFT",
    acquisitionDate: new Date(acquired),
    droppedDate: dropped ? new Date(dropped) : null,
    tradedFromSlotId: null,
  };
}

function fa(
  label: string,
  slotId: number,
  seasonYear: number,
  acquired: string,
  dropped: string | null = null
): Acq {
  return { ...draft(label, slotId, seasonYear, acquired, dropped), acquisitionType: "FA" };
}

function trade(
  label: string,
  slotId: number,
  seasonYear: number,
  acquired: string,
  fromSlot: number,
  dropped: string | null = null
): Acq {
  return {
    ...draft(label, slotId, seasonYear, acquired, dropped),
    acquisitionType: "TRADE",
    tradedFromSlotId: fromSlot,
  };
}

describe("findChainStartYear", () => {
  it("returns the same year when there is no prior season", () => {
    const acqs = [draft("a", 5, 2025, "2025-08-25")];
    expect(findChainStartYear(acqs, 5, 2025)).toBe(2025);
  });

  it("walks back through consecutive drafts on the same slot", () => {
    const acqs = [
      draft("a", 10, 2023, "2023-08-25", "2024-08-24"),
      draft("b", 10, 2024, "2024-08-25", "2025-08-24"),
      draft("c", 10, 2025, "2025-08-25"),
    ];
    expect(findChainStartYear(acqs, 10, 2025)).toBe(2023);
  });

  it("stops at a gap year", () => {
    const acqs = [
      draft("a", 10, 2022, "2022-08-25", "2023-08-24"),
      draft("c", 10, 2024, "2024-08-25"),
    ];
    expect(findChainStartYear(acqs, 10, 2024)).toBe(2024);
  });

  it("does not cross to another slot", () => {
    const acqs = [
      draft("a", 5, 2023, "2023-08-25", "2024-08-24"),
      draft("b", 6, 2024, "2024-08-25", "2025-11-25"),
      draft("c", 6, 2025, "2025-08-25"),
    ];
    // slot 6's run starts in 2024 - slot 5's 2023 draft is a different franchise
    expect(findChainStartYear(acqs, 6, 2025)).toBe(2024);
  });

  it("treats a free-agent season as a break", () => {
    const acqs = [
      draft("a", 8, 2023, "2023-08-25", "2023-10-01"),
      fa("b", 8, 2024, "2024-09-15", "2025-08-24"),
      draft("c", 8, 2025, "2025-08-25"),
    ];
    expect(findChainStartYear(acqs, 8, 2025)).toBe(2025);
  });
});

describe("findTradeSource", () => {
  it("finds the row the trade closed", () => {
    const source = draft("src", 5, 2025, "2025-08-25", "2026-08-22");
    const t = trade("t", 4, 2025, "2026-08-22", 5);
    expect(findTradeSource([source, t], t)?.label).toBe("src");
  });

  it("returns null when the source slot is unknown", () => {
    const t = { ...trade("t", 4, 2025, "2026-08-22", 5), tradedFromSlotId: null };
    expect(findTradeSource([t], t)).toBeNull();
  });

  it("ignores rows dropped after the trade", () => {
    const later = draft("later", 5, 2025, "2025-08-25", "2026-09-01");
    const t = trade("t", 4, 2025, "2026-08-22", 5);
    expect(findTradeSource([later, t], t)).toBeNull();
  });

  it("picks the row dropped closest to the trade", () => {
    const old = draft("old", 5, 2023, "2023-08-25", "2024-08-24");
    const recent = draft("recent", 5, 2025, "2025-08-25", "2026-08-22");
    const t = trade("t", 4, 2025, "2026-08-22", 5);
    expect(findTradeSource([old, recent, t], t)?.label).toBe("recent");
  });
});

describe("resolveTradeBase", () => {
  it("uses the fresh draft when the run restarted before the trade (Bolton)", () => {
    // Drafted R3 by slot 10 in 2023-24, released, re-drafted R5 by slot 5 in
    // 2025, then traded to slot 4.
    const acqs = [
      draft("2023-s10", 10, 2023, "2023-08-25", "2024-08-24"),
      draft("2024-s10", 10, 2024, "2024-08-25", "2025-08-24"),
      draft("2025-s5", 5, 2025, "2025-08-25", "2026-08-22"),
      trade("traded", 4, 2025, "2026-08-22", 5),
    ];
    const t = acqs[3];
    expect(resolveTradeBase(acqs, t)?.label).toBe("2025-s5");
  });

  it("reaches back through a genuine run on the source slot (Hufanga)", () => {
    // slot 5 drafted him in 2023 and released him; slot 6 drafted him fresh in
    // 2024 and kept him in 2025; slot 8 traded for him.
    const acqs = [
      draft("2023-s5", 5, 2023, "2023-08-25", "2024-08-24"),
      draft("2024-s6", 6, 2024, "2024-08-25", "2025-11-25"),
      draft("2025-s6", 6, 2025, "2025-08-25", "2025-11-26"),
      trade("traded", 8, 2025, "2025-11-26", 6),
    ];
    expect(resolveTradeBase(acqs, acqs[3])?.label).toBe("2024-s6");
  });

  it("keeps a long unbroken run intact (Love)", () => {
    const acqs = [
      draft("2023-s10", 10, 2023, "2023-08-25", "2024-08-24"),
      draft("2024-s10", 10, 2024, "2024-08-25", "2025-11-24"),
      draft("2025-s10", 10, 2025, "2025-08-25", "2025-11-25"),
      trade("traded", 8, 2025, "2025-11-25", 10),
    ];
    expect(resolveTradeBase(acqs, acqs[3])?.label).toBe("2023-s10");
  });

  it("follows a player traded twice back to the original draft", () => {
    const acqs = [
      draft("drafted", 3, 2025, "2025-08-25", "2025-10-01"),
      trade("first", 7, 2025, "2025-10-01", 3, "2025-11-01"),
      trade("second", 9, 2025, "2025-11-01", 7),
    ];
    expect(resolveTradeBase(acqs, acqs[2])?.label).toBe("drafted");
  });

  it("returns the free-agent pickup when that started the clock", () => {
    const acqs = [
      fa("pickup", 2, 2025, "2025-09-20", "2025-11-05"),
      trade("traded", 6, 2025, "2025-11-05", 2),
    ];
    expect(resolveTradeBase(acqs, acqs[1])?.label).toBe("pickup");
  });

  it("returns null when the trail cannot be followed", () => {
    const orphan = trade("orphan", 4, 2025, "2026-08-22", 5);
    expect(resolveTradeBase([orphan], orphan)).toBeNull();
  });

  it("does not loop forever on circular trade records", () => {
    const a = trade("a", 1, 2025, "2025-10-02", 2, "2025-10-01");
    const b = trade("b", 2, 2025, "2025-10-01", 1, "2025-10-02");
    expect(resolveTradeBase([a, b], a)).toBeNull();
  });
});
