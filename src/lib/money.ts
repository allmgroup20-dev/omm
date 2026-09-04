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
