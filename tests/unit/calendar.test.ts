import { describe, it, expect } from "vitest";
import { isLeapYear, getDaysInMonth, getMonthDates, toMessLocalDate } from "@/lib/calendar";

describe("calendar — leap year, month boundaries, timezone", () => {
  it("isLeapYear correctly identifies", () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2023)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(1900)).toBe(false);
  });

  it("February 28 days non-leap, 29 leap", () => {
    expect(getDaysInMonth(2023, 2)).toBe(28);
    expect(getDaysInMonth(2024, 2)).toBe(29);
    expect(getDaysInMonth(2020, 2)).toBe(29);
  });

  it("30-day month", () => {
    expect(getDaysInMonth(2026, 4)).toBe(30);
    expect(getDaysInMonth(2026, 9)).toBe(30);
  });

  it("31-day month", () => {
    expect(getDaysInMonth(2026, 1)).toBe(31);
    expect(getDaysInMonth(2026, 12)).toBe(31);
  });

  it("getMonthDates generates correct length for leap year", () => {
    expect(getMonthDates(2024, 2).length).toBe(29);
    expect(getMonthDates(2023, 2).length).toBe(28);
    expect(getMonthDates(2026, 9).length).toBe(30);
  });

  it("toMessLocalDate is timezone aware (Asia/Dhaka)", () => {
    // 2026-09-04T18:00:00Z is 2026-09-05 in Dhaka (UTC+6)
    const d = new Date("2026-09-04T18:00:00Z");
    expect(toMessLocalDate(d, "Asia/Dhaka")).toBe("2026-09-05");
    expect(toMessLocalDate(d, "UTC")).toBe("2026-09-04");
  });

  it("invalid month throws", () => {
    expect(() => getDaysInMonth(2026, 13)).toThrow();
  });
});
