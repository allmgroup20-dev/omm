/**
 * Manager dashboard insights ("নজর দিন"): short, Bengali-digit, tone-coded.
 * Pure helpers — safe to unit test. UI colors by `tone`.
 */

export type InsightTone = "good" | "warn" | "bad";
export type Insight = { tone: InsightTone; icon: string; text: string };

function bn(n: number, maxFrac = 1): string {
  return new Intl.NumberFormat("bn-BD", { minimumFractionDigits: 0, maximumFractionDigits: maxFrac }).format(n);
}

export function buildInsights(input: {
  marketMoM: number; // percent, + = up vs last month
  pendingExpenses: number;
  incompleteMeals: number;
  dueCount: number;
}): Insight[] {
  const out: Insight[] = [];
  if (Math.abs(input.marketMoM) >= 1) {
    const pct = bn(Math.abs(input.marketMoM));
    if (input.marketMoM > 0) {
      out.push({
        tone: input.marketMoM >= 20 ? "bad" : "warn",
        icon: "📈",
        text: `বাজার খরচ গত মাসের চেয়ে ${pct}% বেশি`,
      });
    } else {
      out.push({ tone: "good", icon: "📉", text: `বাজার খরচ গত মাসের চেয়ে ${pct}% কম` });
    }
  }
  if (input.pendingExpenses > 0) {
    out.push({ tone: "warn", icon: "⏳", text: `${bn(input.pendingExpenses, 0)}টি খরচ অনুমোদনের অপেক্ষায়` });
  }
  if (input.incompleteMeals > 0) {
    out.push({ tone: "warn", icon: "🍚", text: `${bn(input.incompleteMeals, 0)} জনের আজকের মিল বাকি` });
  }
  if (input.dueCount > 0) {
    out.push({ tone: "bad", icon: "🔴", text: `${bn(input.dueCount, 0)} জনের বকেয়া আছে` });
  }
  return out;
}
