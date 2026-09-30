/**
 * Financial integrity: store BDT as integer paisa (1 BDT = 100 paisa)
 * Avoid floating-point errors. All calculations use integers.
 */

export function toPaisa(bdt: number | string): number {
  const n = typeof bdt === "string" ? parseFloat(bdt) : bdt;
  if (Number.isNaN(n)) throw new Error(`Invalid amount: ${bdt}`);
  return Math.round(n * 100);
}

export function fromPaisa(paisa: number): number {
  return paisa / 100;
}

export function formatBDT(paisa: number, showSymbol = true): string {
  const bdt = paisa / 100;
  const formatted = new Intl.NumberFormat("bn-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(bdt);
  return showSymbol ? `৳${formatted}` : formatted;
}

export function formatBDTEn(paisa: number): string {
  const bdt = paisa / 100;
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 2,
  }).format(bdt);
}

export function addPaisa(...amounts: number[]): number {
  return amounts.reduce((a, b) => a + b, 0);
}

export function calcMealRate(totalCostPaisa: number, totalMealsScaled: number): number {
  // totalMealsScaled is meals * 100 (to support 0.5)
  if (totalMealsScaled === 0) return 0;
  // rate paisa per 1 meal = totalCostPaisa * 100 / totalMealsScaled
  return Math.round((totalCostPaisa * 100) / totalMealsScaled);
}

/**
 * Monthly member balance = month deposits − month meal cost (all in paisa).
 * + = advance (extra deposited), − = due (to collect), 0 = settled.
 * Previous-month carry + other-expense allocation live on the settlement page,
 * NOT here — ledger running balances are deposit-only (no meal_cost postings).
 */
export function monthlyNetBalance(depositPaisa: number, mealCostPaisa: number): number {
  return depositPaisa - mealCostPaisa;
}

export function netBalanceStatus(netPaisa: number): "advance" | "due" | "settled" {
  if (netPaisa > 0) return "advance";
  if (netPaisa < 0) return "due";
  return "settled";
}

/**
 * Dashboard viewer classification (join prompt is ONLY for guests).
 * - no account → "guest" (30s login/register nag allowed)
 * - logged in + member of this mess → "member" (never nagged)
 * - logged in + not a member → "outsider" (inline join button only, never nagged)
 */
export function classifyDashboardViewer(opts: {
  hasUser: boolean;
  memberOk: boolean;
  isGuest: boolean;
  hasTarget: boolean;
}): "guest" | "member" | "outsider" {
  if (!opts.hasUser) return "guest";
  if (opts.memberOk && !opts.isGuest && opts.hasTarget) return "member";
  return "outsider";
}
