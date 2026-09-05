import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { messMembers, marketEntries, expenses, deposits, mealRecords, monthlySettlements } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0]) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const type = url.searchParams.get("type"); // daily|monthly|yearly|market|expense|deposit|due
  const year = Number(url.searchParams.get("year") || NaN);
  const month = Number(url.searchParams.get("month") || NaN);
  const date = url.searchParams.get("date");

  if (type === "daily" && date) {
    const markets = await db.select().from(marketEntries).where(eq(marketEntries.messId, id));
    const exps = await db.select().from(expenses).where(eq(expenses.messId, id));
    const deps = await db.select().from(deposits).where(eq(deposits.messId, id));
    const meals = await db.select().from(mealRecords).where(eq(mealRecords.messId, id));
    return NextResponse.json({
      date,
      markets: markets.filter((r) => r.date === date && r.status === "active"),
      expenses: exps.filter((r) => r.date === date && r.status === "approved"),
      deposits: deps.filter((r) => r.date === date && r.status === "active"),
      meals: meals.filter((r) => r.date === date),
    });
  }

  if (type === "monthly" && year && month) {
    const prefix = `${year}-${String(month).padStart(2, "0")}-`;
    const markets = await db.select().from(marketEntries).where(eq(marketEntries.messId, id));
    const exps = await db.select().from(expenses).where(eq(expenses.messId, id));
    const deps = await db.select().from(deposits).where(eq(deposits.messId, id));
    const meals = await db.select().from(mealRecords).where(eq(mealRecords.messId, id));
    const settlements = await db.select().from(monthlySettlements).where(and(eq(monthlySettlements.messId, id), eq(monthlySettlements.year, year), eq(monthlySettlements.month, month))).limit(1);
    return NextResponse.json({
      year,
      month,
      markets: markets.filter((r) => r.date.startsWith(prefix)),
      expenses: exps.filter((r) => r.date.startsWith(prefix)),
      deposits: deps.filter((r) => r.date.startsWith(prefix)),
      meals: meals.filter((r) => r.date.startsWith(prefix)),
      settlement: settlements[0] || null,
    });
  }

  if (type === "yearly" && year) {
    const prefix = `${year}-`;
    const settlements = await db.select().from(monthlySettlements).where(and(eq(monthlySettlements.messId, id), eq(monthlySettlements.year, year)));
    const markets = await db.select().from(marketEntries).where(eq(marketEntries.messId, id));
    const exps = await db.select().from(expenses).where(eq(expenses.messId, id));
    const deps = await db.select().from(deposits).where(eq(deposits.messId, id));
    const yearlyMarkets = markets.filter((r) => r.date.startsWith(prefix));
    const yearlyExps = exps.filter((r) => r.date.startsWith(prefix));
    const yearlyDeps = deps.filter((r) => r.date.startsWith(prefix));
    const totalMeals = settlements.reduce((a, s) => a + s.totalMealsScaled, 0);
    const totalExpense = yearlyMarkets.reduce((a, r) => a + r.finalPaisa, 0) + yearlyExps.filter((r) => r.status === "approved").reduce((a, r) => a + r.amountPaisa, 0);
    return NextResponse.json({
      year,
      settlements,
      totalMeals: totalMeals / 100,
      totalExpensePaisa: totalExpense,
      totalDepositPaisa: yearlyDeps.filter((r) => r.status === "active").reduce((a, r) => a + r.amountPaisa, 0),
      monthlyCount: settlements.length,
    });
  }

  return NextResponse.json({ error: "Invalid report type. Use type=daily&date=YYYY-MM-DD or type=monthly&year&month or type=yearly&year" }, { status: 400 });
}
