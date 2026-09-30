import { describe, it, expect } from "vitest";
import { groupEntriesByDate, formatMarketQty, formatDayBn, entryMonth, type MarketDrawerEntry } from "@/lib/market-view";

const e = (over: Partial<MarketDrawerEntry> & { id: string; date: string }): MarketDrawerEntry => ({
  finalPaisa: 0,
  status: "active",
  ...over,
});

describe("market drawer — date grouping", () => {
  it("groups entries under their date, newest date first", () => {
    const groups = groupEntriesByDate([
      e({ id: "a", date: "2026-09-19", finalPaisa: 80000 }),
      e({ id: "b", date: "2026-09-20", finalPaisa: 120000 }),
      e({ id: "c", date: "2026-09-20", finalPaisa: 205000 }),
    ]);
    expect(groups.map((g) => g.date)).toEqual(["2026-09-20", "2026-09-19"]);
    expect(groups[0].count).toBe(2);
    expect(groups[1].count).toBe(1);
  });

  it("day total = sum of entry finals", () => {
    const groups = groupEntriesByDate([
      e({ id: "a", date: "2026-09-20", finalPaisa: 120000 }),
      e({ id: "b", date: "2026-09-20", finalPaisa: 205000 }),
    ]);
    expect(groups[0].dayTotalPaisa).toBe(325000); // ৳৩২৫০
  });

  it("excludes voided/reversed entries", () => {
    const groups = groupEntriesByDate([
      e({ id: "a", date: "2026-09-20", finalPaisa: 50000, status: "voided" }),
      e({ id: "b", date: "2026-09-20", finalPaisa: 80000, status: "active" }),
    ]);
    expect(groups[0].count).toBe(1);
    expect(groups[0].dayTotalPaisa).toBe(80000);
  });

  it("empty list → no groups", () => {
    expect(groupEntriesByDate([])).toEqual([]);
  });
});

describe("market drawer — quantity + date formatting", () => {
  it("x1000 scaled quantities trim cleanly", () => {
    expect(formatMarketQty(1000)).toBe("1"); // ১ কেজি
    expect(formatMarketQty(500)).toBe("0.5");
    expect(formatMarketQty(42560)).toBe("42.56");
    expect(formatMarketQty(250)).toBe("0.25");
  });

  it("entryMonth slices YYYY-MM", () => {
    expect(entryMonth("2026-09-20")).toBe("2026-09");
  });

  it("formatDayBn renders Bengali day-month", () => {
    const s = formatDayBn("2026-09-20");
    expect(s).toContain("সেপ্টেম্বর");
    expect(s).not.toBe("2026-09-20");
  });

  it("bad date falls back to raw string", () => {
    expect(formatDayBn("not-a-date")).toBe("not-a-date");
  });
});
