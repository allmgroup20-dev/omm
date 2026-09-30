import { getRequestDb } from "@/db";
import { messes, closingPeriods, mealLocks, monthlySettlements } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function getMessPrecision(messId: string): Promise<number> {
  const db = await getRequestDb();
  const rows = await db.select({ p: messes.defaultMealPrecision }).from(messes).where(eq(messes.id, messId)).limit(1);
  return rows[0]?.p ?? 50;
}

export async function isDateLocked(messId: string, date: string): Promise<boolean> {
  const db = await getRequestDb();
  const rows = await db.select().from(mealLocks).where(and(eq(mealLocks.messId, messId), eq(mealLocks.date, date))).limit(1);
  return !!rows[0];
}

export async function isMonthClosed(messId: string, date: string): Promise<boolean> {
  // date YYYY-MM-DD -> year/month. Either lock counts: closed period OR final
  // settlement (close/reopen set both, but check both for safety).
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7));
  const db = await getRequestDb();
  const [closeRows, settRows] = await Promise.all([
    db.select().from(closingPeriods).where(and(eq(closingPeriods.messId, messId), eq(closingPeriods.year, y), eq(closingPeriods.month, m))).limit(1),
    db.select().from(monthlySettlements).where(and(eq(monthlySettlements.messId, messId), eq(monthlySettlements.year, y), eq(monthlySettlements.month, m))).limit(1),
  ]);
  return closeRows[0]?.status === "closed" || settRows[0]?.status === "final";
}

export async function isMonthClosedByYM(messId: string, year: number, month: number): Promise<boolean> {
  const db = await getRequestDb();
  const rows = await db.select().from(closingPeriods).where(and(eq(closingPeriods.messId, messId), eq(closingPeriods.year, year), eq(closingPeriods.month, month))).limit(1);
  return rows[0]?.status === "closed";
}
