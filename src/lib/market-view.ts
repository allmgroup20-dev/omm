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

/** Editable item row (string form state, same shape as market add page). */
export type MarketEditRow = {
  productName: string;
  categoryName: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  total: string; // exact pasted total wins when present
};

export type MarketItemPayload = {
  productName: string;
  categoryName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total?: number;
};

/**
 * Build PATCH items payload: drop nameless/zero-qty rows, parse numbers.
 * Mirrors the market add-page submit mapping exactly.
 */
export function buildMarketItemsPayload(rows: MarketEditRow[]): MarketItemPayload[] {
  return rows
    .filter((it) => it.productName.trim() && (parseFloat(it.quantity) || 0) > 0)
    .map((it) => ({
      productName: it.productName.trim(),
      categoryName: (it.categoryName || "").trim(),
      quantity: parseFloat(it.quantity) || 0,
      unit: it.unit || "kg",
      unitPrice: parseFloat(it.unitPrice) || 0,
      ...(it.total ? { total: parseFloat(it.total) || 0 } : {}),
    }));
}

/** Live preview total of edit rows (BDT): exact totals win, else qty×price. */
export function previewItemsTotalBDT(rows: MarketEditRow[]): number {
  return rows.reduce(
    (a, it) => a + (it.total ? parseFloat(it.total) || 0 : (parseFloat(it.quantity) || 0) * (parseFloat(it.unitPrice) || 0)),
    0,
  );
}
