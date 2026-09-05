import { getRequestDb } from "@/db";
import { ledgerEntries, deposits, mealRecords, marketEntries, expenses } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getMemberBalancePaisa(messId: string, memberId: string): Promise<number> {
  const db = await getRequestDb();
  const rows = await db.select().from(ledgerEntries).where(eq(ledgerEntries.memberId, memberId));
  // filter by messId (ledgerEntries has messId, but we query by memberId which is unique per mess)
  const filtered = rows.filter((r) => r.messId === messId);
  if (filtered.length === 0) return 0;
  // last entry's balance is current (sorted by createdAt)
  const sorted = filtered.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return sorted[sorted.length - 1].balancePaisa;
}

export async function computeMemberDepositsPaisa(messId: string, memberId: string, upToDate?: string): Promise<number> {
  const db = await getRequestDb();
  const rows = await db.select().from(deposits).where(eq(deposits.memberId, memberId));
  let filtered = rows.filter((r) => r.messId === messId && r.status === "active");
  if (upToDate) filtered = filtered.filter((r) => r.date <= upToDate);
  return filtered.reduce((a, r) => a + r.amountPaisa, 0);
}

export async function computeMemberMealsScaled(messId: string, memberId: string, year: number, month: number): Promise<number> {
  const db = await getRequestDb();
  const rows = await db.select().from(mealRecords).where(eq(mealRecords.messId, messId));
  const mm = String(month).padStart(2, "0");
  const prefix = `${year}-${mm}-`;
  const filtered = rows.filter((r) => r.memberId === memberId && r.date.startsWith(prefix));
  return filtered.reduce((a, r) => a + r.quantityScaled, 0);
}

export async function computeMonthlyFinance(messId: string, year: number, month: number) {
  const db = await getRequestDb();
  const mm = String(month).padStart(2, "0");
  const prefix = `${year}-${mm}-`;
  const marketRows = await db.select().from(marketEntries).where(eq(marketEntries.messId, messId));
  const expRows = await db.select().from(expenses).where(eq(expenses.messId, messId));
  const mealRows = await db.select().from(mealRecords).where(eq(mealRecords.messId, messId));

  const monthMarkets = marketRows.filter((r) => r.date.startsWith(prefix) && r.status === "active");
  const monthExpenses = expRows.filter((r) => r.date.startsWith(prefix) && r.status === "approved");
  const monthMeals = mealRows.filter((r) => r.date.startsWith(prefix));

  const totalMarketPaisa = monthMarkets.reduce((a, r) => a + r.finalPaisa, 0);
  const totalOtherPaisa = monthExpenses.reduce((a, r) => a + r.amountPaisa, 0);
  const totalMealsScaled = monthMeals.reduce((a, r) => a + r.quantityScaled, 0);
  // mealRate paisa per meal
  const mealRatePaisa = totalMealsScaled > 0 ? Math.round((totalMarketPaisa * 100) / totalMealsScaled) : 0;

  return { totalMarketPaisa, totalOtherPaisa, totalMealsScaled, mealRatePaisa, monthMeals, monthMarkets, monthExpenses };
}
