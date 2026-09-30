/**
 * Market drawer view helpers (manager dashboard): group entries by date,
 * day totals, and market quantity formatting (quantities are x1000).
 * Pure functions — safe to unit test.
 */

export type MarketDrawerItem = {
  id: string;
  productNameSnapshot: string;
  categoryNameSnapshot?: string | null;
  quantityScaled: number;
  unit: string;
  unitPricePaisa: number;
  totalPaisa: number;
};

export type MarketDrawerEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  status?: string;
  finalPaisa: number;
  totalPaisa?: number;
  discountPaisa?: number;
  transportPaisa?: number;
  paymentMethod?: string;
  notes?: string | null;
  vendorId?: string | null;
  items?: MarketDrawerItem[];
  purchaserNames?: string[];
};

export type MarketDateGroup = {
  date: string;
  entries: MarketDrawerEntry[];
  count: number;
  dayTotalPaisa: number;
};

/** "2026-09-20" -> "2026-09" */
export function entryMonth(date: string): string {
  return date.slice(0, 7);
}

/** 42560 (x1000) -> "42.56"; 1000 -> "1"; 500 -> "0.5" */
export function formatMarketQty(quantityScaled: number): string {
  return (quantityScaled / 1000).toFixed(3).replace(/\.?0+$/, "");
}

/**
 * Group active entries by date (desc), each group sorted desc by creation
 * order preserved from input. Day total = sum of finalPaisa.
 * Voided/reversed entries are excluded (callers may pre-filter too).
 */
export function groupEntriesByDate(entries: MarketDrawerEntry[]): MarketDateGroup[] {
  const active = entries.filter((e) => !e.status || e.status === "active");
  const byDate = new Map<string, MarketDrawerEntry[]>();
  for (const e of active) {
    const list = byDate.get(e.date) || [];
    list.push(e);
    byDate.set(e.date, list);
  }
  return [...byDate.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, list]) => ({
      date,
      entries: list,
      count: list.length,
      dayTotalPaisa: list.reduce((s, e) => s + (e.finalPaisa || 0), 0),
    }));
}

/** "2026-09-20" -> "২০ সেপ্টেম্বর" (day + month, Bengali digits) */
export function formatDayBn(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return new Intl.DateTimeFormat("bn-BD", { day: "numeric", month: "long" }).format(d);
}
