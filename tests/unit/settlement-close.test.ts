import { describe, it, expect } from "vitest";
import { isMemberInMonth, nextYearMonth, carryDepositTarget, canRecordCarry, canRecordRefund, prevYearMonth } from "@/lib/settlement";
import { isMemberVisibleForEntry } from "@/lib/money";

describe("month-close — member month window (leave till month-end)", () => {
  const sept = { year: 2026, month: 9 }; // 30 days

  it("active member belongs to every month", () => {
    expect(isMemberInMonth({ joinedAt: "2026-01-05T00:00:00.000Z", leftAt: null }, sept.year, sept.month)).toBe(true);
  });

  it("member who left mid-September still counts for September", () => {
    expect(isMemberInMonth({ joinedAt: "2026-01-05T00:00:00.000Z", leftAt: "2026-09-15T10:00:00.000Z" }, 2026, 9)).toBe(true);
  });

  it("same member is gone from October", () => {
    expect(isMemberInMonth({ joinedAt: "2026-01-05T00:00:00.000Z", leftAt: "2026-09-15T10:00:00.000Z" }, 2026, 10)).toBe(false);
  });

  it("month-end leave (30th) keeps September, drops October", () => {
    const m = { joinedAt: "2026-01-05T00:00:00.000Z", leftAt: "2026-09-30T00:00:00.000Z" };
    expect(isMemberInMonth(m, 2026, 9)).toBe(true);
    expect(isMemberInMonth(m, 2026, 10)).toBe(false);
  });

  it("future joiner excluded from earlier months", () => {
    expect(isMemberInMonth({ joinedAt: "2026-10-02T00:00:00.000Z", leftAt: null }, 2026, 9)).toBe(false);
    expect(isMemberInMonth({ joinedAt: "2026-10-02T00:00:00.000Z", leftAt: null }, 2026, 10)).toBe(true);
  });

  it("left before the month starts is excluded", () => {
    expect(isMemberInMonth({ joinedAt: "2026-01-05T00:00:00.000Z", leftAt: "2026-08-31T00:00:00.000Z" }, 2026, 9)).toBe(false);
  });
});

describe("month-close — entry-list visibility", () => {
  const TODAY = "2026-09-15";
  it("active always visible", () => {
    expect(isMemberVisibleForEntry({ status: "active", leftAt: null }, TODAY)).toBe(true);
  });
  it("left with future leftAt stays till that date", () => {
    expect(isMemberVisibleForEntry({ status: "left", leftAt: "2026-09-30T00:00:00.000Z" }, TODAY)).toBe(true);
    expect(isMemberVisibleForEntry({ status: "left", leftAt: "2026-09-30T00:00:00.000Z" }, "2026-10-01")).toBe(false);
  });
  it("left effective now hides immediately", () => {
    expect(isMemberVisibleForEntry({ status: "left", leftAt: "2026-09-15T10:00:00.000Z" }, "2026-09-16")).toBe(false);
  });
});

describe("month-close — advance disposition math", () => {
  it("example: deposit 2000 − cost 1900 = +100 advance", () => {
    const closing = 200000 - 190000;
    expect(closing).toBe(10000);
    // refund zeroes next opening; carry keeps it
    expect(closing + -closing).toBe(0);
    expect(closing + 0).toBe(closing);
  });
  it("latest disposition wins (carry then refund → 0)", () => {
    const closing = 10000;
    const rows = [
      { kind: "carry", amountPaisa: 0, createdAt: "2026-09-20T00:00:00.000Z" },
      { kind: "refund", amountPaisa: -10000, createdAt: "2026-09-25T00:00:00.000Z" },
    ].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    expect(closing + rows[rows.length - 1].amountPaisa).toBe(0);
  });

  it("opening composition: closing + latest adjustment (dashboard আগের জের)", () => {    const openingOf = (closing: number | null, adjs: { amountPaisa: number; createdAt: string }[]) => {
      if (closing === null) return 0; // no prior settlement
      if (!adjs.length) return closing; // auto-carry
      const latest = [...adjs].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).pop()!;
      return closing + latest.amountPaisa;
    };
    expect(openingOf(null, [])).toBe(0);
    expect(openingOf(10000, [])).toBe(10000); // untouched advance carries
    expect(openingOf(10000, [{ amountPaisa: 0, createdAt: "2026-09-20T00:00:00.000Z" }])).toBe(10000); // explicit carry
    expect(openingOf(10000, [{ amountPaisa: -10000, createdAt: "2026-09-21T00:00:00.000Z" }])).toBe(0); // refunded
    expect(openingOf(-50000, [])).toBe(-50000); // due carries as negative opening
  });
});

describe("carry as real deposit — next-month 1st entry", () => {
  it("September carry targets October 1st with surplus note", () => {
    const t = carryDepositTarget(2026, 9);
    expect(t.date).toBe("2026-10-01");
    expect(t.periodYm).toBe("2026-10");
    expect(t.note).toContain("2026-09");
    expect(t.note).toContain("উদ্বৃত্ত");
  });

  it("December rolls to January next year", () => {
    expect(nextYearMonth(2026, 12)).toEqual({ year: 2027, month: 1 });
    expect(carryDepositTarget(2026, 12).date).toBe("2027-01-01");
    expect(nextYearMonth(2026, 9)).toEqual({ year: 2026, month: 10 });
  });

  it("carry + offset adjustment nets exactly once (no double count)", () => {
    const closing = 10000; // +100 advance
    // October: opening(prev) 0 + real deposit 100
    const opening = closing + -closing; // offset adjustment
    const deposit = closing;
    expect(opening).toBe(0);
    expect(opening + deposit).toBe(10000);
  });

  it("double carry blocked only while linked deposit active", () => {
    expect(canRecordCarry(null)).toBe(true);
    expect(canRecordCarry({ kind: "refund", refActive: false })).toBe(true);
    expect(canRecordCarry({ kind: "carry", refActive: true })).toBe(false);
    expect(canRecordCarry({ kind: "carry", refActive: false })).toBe(true); // voided → re-carry ok
  });

  it("double refund blocked; refund after carry allowed", () => {
    expect(canRecordRefund(null)).toBe(true);
    expect(canRecordRefund({ kind: "carry", refActive: true })).toBe(true);
    expect(canRecordRefund({ kind: "refund", refActive: false })).toBe(false);
  });

  it("previous month steps back over year boundary", () => {
    expect(prevYearMonth(2026, 10)).toEqual({ year: 2026, month: 9 });
    expect(prevYearMonth(2026, 1)).toEqual({ year: 2025, month: 12 });
  });
});
