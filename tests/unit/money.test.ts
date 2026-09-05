import { describe, it, expect } from "vitest";
import { toPaisa, fromPaisa, formatBDT, calcMealRate } from "@/lib/money";

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
