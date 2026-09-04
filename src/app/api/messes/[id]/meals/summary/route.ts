import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getDb } from "@/db";
import { mealRecords, messMembers, marketEntries, expenses, closingPeriods } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { calcMealRate } from "@/lib/money";
import { getMonthDates } from "@/lib/calendar";

// Returns monthly summary: total meals, meal rate, total costs — transparent breakdown
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0]) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const year = Number(url.searchParams.get("year"));
  const month = Number(url.searchParams.get("month"));
  if (!year || !month) return NextResponse.json({ error: "year and month required" }, { status: 400 });

  const dates = getMonthDates(year, month);
  const first = dates[0];
  const last = dates[dates.length - 1];

  const meals = await db.select().from(mealRecords).where(eq(mealRecords.messId, id));
  const monthMeals = meals.filter((r) => r.date >= first && r.date <= last);
  const totalMealsScaled = monthMeals.reduce((a, r) => a + r.quantityScaled, 0);

  const markets = await db.select().from(marketEntries).where(eq(marketEntries.messId, id));
  const monthMarkets = markets.filter((r) => r.date >= first && r.date <= last && r.status === "active");
  const totalMarketPaisa = monthMarkets.reduce((a, r) => a + r.finalPaisa, 0);

  const exps = await db.select().from(expenses).where(eq(expenses.messId, id));
  const monthExps = exps.filter((r) => r.date >= first && r.date <= last && r.status === "approved");
  const totalOtherPaisa = monthExps.reduce((a, r) => a + r.amountPaisa, 0);

  // Food cost = market food classification (for now totalMarket)
  const totalFoodCostPaisa = totalMarketPaisa;
  const mealRatePaisa = calcMealRate(totalFoodCostPaisa, totalMealsScaled);

  const closed = await db
    .select()
    .from(closingPeriods)
    .where(and(eq(closingPeriods.messId, id), eq(closingPeriods.year, year), eq(closingPeriods.month, month)))
    .limit(1);

  // member breakdown
  const byMember: Record<string, number> = {};
  for (const r of monthMeals) byMember[r.memberId] = (byMember[r.memberId] || 0) + r.quantityScaled;

  return NextResponse.json({
    year,
    month,
    totalMeals: totalMealsScaled / 100,
    totalMealsScaled,
    totalMarketPaisa,
    totalOtherPaisa,
    totalFoodCostPaisa,
    mealRatePaisa,
    mealRateBDT: mealRatePaisa / 100,
    breakdown: `Food Expense ৳${(totalFoodCostPaisa / 100).toFixed(2)} ÷ Total Meals ${totalMealsScaled / 100} = Meal Rate ৳${(mealRatePaisa / 100).toFixed(2)}`,
    byMember, // memberId -> scaled
    closed: closed[0]?.status === "closed",
    datesCount: dates.length,
  });
}
