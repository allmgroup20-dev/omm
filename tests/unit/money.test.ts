import { describe, it, expect } from "vitest";
import { toPaisa, fromPaisa, formatBDT, calcMealRate, formatPaisaBnCompact, formatNumBn } from "@/lib/money";
import { formatDateBD } from "@/i18n/dict";

describe("money — paisa-safe financial calculations", () => {
  it("toPaisa converts BDT to paisa", () => {
    expect(toPaisa(350.5)).toBe(35050);
    expect(toPaisa("70")).toBe(7000);
    expect(toPaisa(0)).toBe(0);
  });

  it("fromPaisa converts back", () => {
    expect(fromPaisa(35050)).toBe(350.5);
  });

  it("formatBDT contains taka symbol", () => {
    const s = formatBDT(35050);
    expect(s).toContain("৳");
  });

  it("calcMealRate: 20000 BDT / 500 meals = 40 BDT", () => {
    // totalCost 20000 BDT => 2000000 paisa, totalMeals 500 => scaled 50000
    const rate = calcMealRate(2000000, 50000);
    expect(rate).toBe(4000); // 40 BDT in paisa
    expect(rate / 100).toBe(40);
  });

  it("calcMealRate handles zero meals", () => {
    expect(calcMealRate(100000, 0)).toBe(0);
  });

  it("calcMealRate with decimal meals (0.5)", () => {
    // 100 BDT cost, 2.5 meals => 40 rate
    const rate = calcMealRate(10000, 250); // 100*100 paisa, 2.5*100 scaled
    expect(rate / 100).toBe(40);
  });

  it("qty * price auto-calc: 5kg * 70", () => {
    const qty = 5;
    const price = 70;
    const total = Math.round(qty * price * 100);
    expect(total).toBe(35000);
  });
});

describe("money — Bengali compact display (KPI cards)", () => {
  it("whole taka drops decimals, Bengali digits", () => {
    const s = formatPaisaBnCompact(319500);
    expect(s).toContain("৩,১৯৫");
    expect(s).not.toContain("০০");
  });

  it("fractional rate keeps decimals", () => {
    expect(formatPaisaBnCompact(19969)).toContain("১৯৯.৬৯");
  });

  it("negatives put minus before Taka sign (no ৳-X)", () => {
    const s = formatPaisaBnCompact(-66797);
    expect(s.startsWith("−৳")).toBe(true);
    expect(s).toContain("৬৬৭.৯৭");
    expect(s).not.toContain("৳-");
  });

  it("zero and small amounts", () => {
    expect(formatPaisaBnCompact(0)).toBe("৳০");
    expect(formatPaisaBnCompact(-24455)).toBe("−৳২৪৪.৫৫");
  });

  it("counts in Bengali digits", () => {
    expect(formatNumBn(5, 0)).toBe("৫");
    expect(formatNumBn(16, 0)).toBe("১৬");
    expect(formatNumBn(3.25)).toBe("৩.৩");
  });
});

describe("dates — Bengali BD format has no grouping comma", () => {
  it("2026-10-03 renders without comma in year", () => {
    const s = formatDateBD("2026-10-03", "bn");
    expect(s).not.toContain(",");
    expect(s).toContain("২০২৬");
  });

  it("day-month padded, year plain", () => {
    expect(formatDateBD("2026-01-05", "bn")).toBe("০৫-০১-২০২৬");
  });

  it("invalid input passes through", () => {
    expect(formatDateBD("oops", "bn")).toBe("oops");
  });
});
