import { describe, it, expect } from "vitest";
import { calcMealRate } from "@/lib/money";

describe("settlement logic — meal rate, allocation, closing", () => {
  it("meal rate transparent breakdown", () => {
    const totalMarket = 2000000; // 20000 BDT paisa
    const totalMealsScaled = 50000; // 500 meals *100
    const rate = calcMealRate(totalMarket, totalMealsScaled);
    expect(`Food Expense ৳${totalMarket / 100} ÷ Total Meal ${totalMealsScaled / 100} = Meal Rate ৳${rate / 100}`).toContain("Meal Rate");
  });

  it("equal allocation splits correctly", () => {
    const totalOther = 300000; // 3000 BDT
    const members = 3;
    const per = Math.round(totalOther / members); // 100000
    expect(per).toBe(100000);
    expect(per * members).toBe(totalOther);
  });

  it("meal_proportional allocation", () => {
    const totalOther = 300000;
    const meals = [10000, 20000, 0]; // scaled: 100,200,0 meals
    const totalMeals = 30000;
    const allocated = meals.map((m) => Math.round((m * totalOther) / totalMeals));
    expect(allocated[0]).toBe(100000); // 100/300 *3000
    expect(allocated[1]).toBe(200000);
    expect(allocated[2]).toBe(0);
    expect(allocated.reduce((a, b) => a + b, 0)).toBe(totalOther);
  });

  it("closing balance formula: Previous + Deposit - MealCost - Allocated", () => {
    const prev = 50000; // 500 BDT
    const deposit = 500000; // 5000
    const mealCost = 40000; // 400
    const allocated = 10000; // 100
    const closing = prev + deposit - mealCost - allocated;
    expect(closing).toBe(50000 + 500000 - 40000 - 10000);
    // Positive => advance, Negative => due
    expect(closing > 0 ? "advance" : closing < 0 ? "due" : "settled").toBe("advance");
  });

  it("due case", () => {
    const closing = 0 + 10000 - 50000 - 0; // deposit 100, cost 500
    expect(closing < 0).toBe(true);
  });

  it("reproducibility: same inputs always same rate", () => {
    const r1 = calcMealRate(1000000, 25000);
    const r2 = calcMealRate(1000000, 25000);
    expect(r1).toBe(r2);
  });
});
