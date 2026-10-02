import { describe, it, expect } from "vitest";
import { buildInsights } from "@/lib/dashboard";

describe("dashboard insights — concise Bengali tones", () => {
  it("market drop is good news with Bengali digits", () => {
    const [ins] = buildInsights({ marketMoM: -64.5, pendingExpenses: 0, incompleteMeals: 0, dueCount: 0 });
    expect(ins.tone).toBe("good");
    expect(ins.text).toContain("৬৪.৫% কম");
  });

  it("big market jump is bad, small jump is warn", () => {
    expect(buildInsights({ marketMoM: 25, pendingExpenses: 0, incompleteMeals: 0, dueCount: 0 })[0].tone).toBe("bad");
    expect(buildInsights({ marketMoM: 5, pendingExpenses: 0, incompleteMeals: 0, dueCount: 0 })[0].tone).toBe("warn");
  });

  it("tiny MoM (<1%) stays silent", () => {
    expect(buildInsights({ marketMoM: 0.5, pendingExpenses: 0, incompleteMeals: 0, dueCount: 0 })).toEqual([]);
  });

  it("due is red with Bengali count, no English words", () => {
    const [ins] = buildInsights({ marketMoM: 0, pendingExpenses: 0, incompleteMeals: 0, dueCount: 4 });
    expect(ins.tone).toBe("bad");
    expect(ins.text).toBe("৪ জনের বকেয়া আছে");
    expect(ins.text).not.toContain("Due");
    expect(ins.icon).toBe("🔴");
  });

  it("pending + incomplete meals are amber, Bengali", () => {
    const out = buildInsights({ marketMoM: 0, pendingExpenses: 3, incompleteMeals: 4, dueCount: 0 });
    expect(out.map((i) => i.tone)).toEqual(["warn", "warn"]);
    expect(out[0].text).toContain("৩টি");
    expect(out[0].text).toContain("অনুমোদন");
    expect(out[1].text).toContain("৪ জন");
  });

  it("all quiet → empty (box hidden)", () => {
    expect(buildInsights({ marketMoM: 0, pendingExpenses: 0, incompleteMeals: 0, dueCount: 0 })).toEqual([]);
  });
});
