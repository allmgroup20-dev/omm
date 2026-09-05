import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getDb } from "@/db";
import { messMembers, mealRecords, marketEntries, marketEntryItems, expenses, deposits } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0]) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const year = Number(url.searchParams.get("year") || new Date().getFullYear());
  const month = Number(url.searchParams.get("month") || 0); // 0 = yearly

  const markets = await db.select().from(marketEntries).where(eq(marketEntries.messId, id));
  const items = await db.select().from(marketEntryItems);
  const exps = await db.select().from(expenses).where(eq(expenses.messId, id));
  const meals = await db.select().from(mealRecords).where(eq(mealRecords.messId, id));
  const deps = await db.select().from(deposits).where(eq(deposits.messId, id));
  const members = await db.select().from(messMembers).where(eq(messMembers.messId, id));

  // Daily expense trend (last 30 days or month)
  const dailyTrendMap: Record<string, { market: number; other: number }> = {};
  for (const m of markets.filter((r) => r.status === "active")) {
    if (!dailyTrendMap[m.date]) dailyTrendMap[m.date] = { market: 0, other: 0 };
    dailyTrendMap[m.date].market += m.finalPaisa / 100;
  }
  for (const e of exps.filter((r) => r.status === "approved")) {
    if (!dailyTrendMap[e.date]) dailyTrendMap[e.date] = { market: 0, other: 0 };
    dailyTrendMap[e.date].other += e.amountPaisa / 100;
  }

  const sortedDates = Object.keys(dailyTrendMap).sort();
  const dailyTrend = sortedDates.slice(-30).map((d) => ({ date: d.slice(5), market: dailyTrendMap[d].market, other: dailyTrendMap[d].other, total: dailyTrendMap[d].market + dailyTrendMap[d].other }));

  // Monthly trend (last 12 months)
  const monthlyMap: Record<string, { market: number; other: number; meals: number }> = {};
  for (const m of markets.filter((r) => r.status === "active")) {
    const ym = m.date.slice(0, 7);
    if (!monthlyMap[ym]) monthlyMap[ym] = { market: 0, other: 0, meals: 0 };
    monthlyMap[ym].market += m.finalPaisa / 100;
  }
  for (const e of exps.filter((r) => r.status === "approved")) {
    const ym = e.date.slice(0, 7);
    if (!monthlyMap[ym]) monthlyMap[ym] = { market: 0, other: 0, meals: 0 };
    monthlyMap[ym].other += e.amountPaisa / 100;
  }
  for (const r of meals) {
    const ym = r.date.slice(0, 7);
    if (!monthlyMap[ym]) monthlyMap[ym] = { market: 0, other: 0, meals: 0 };
    monthlyMap[ym].meals += r.quantityScaled / 100;
  }
  const monthlyTrend = Object.keys(monthlyMap).sort().slice(-12).map((ym) => ({ ym, ...monthlyMap[ym], total: monthlyMap[ym].market + monthlyMap[ym].other }));

  // Member meal comparison (current month or selected month)
  const targetYM = month ? `${year}-${String(month).padStart(2, "0")}` : null;
  const memberMealComp = members.map((mem) => {
    const mMeals = meals.filter((r) => r.memberId === mem.id && (!targetYM || r.date.startsWith(targetYM)));
    const total = mMeals.reduce((a, r) => a + r.quantityScaled / 100, 0);
    return { memberId: mem.id, meals: total };
  });

  // Category spending (via items)
  const entryIdsForMess = new Set(markets.filter((e) => e.status === "active").map((e) => e.id));
  const messItems = items.filter((it) => entryIdsForMess.has(it.entryId));
  const categorySpend: Record<string, number> = {};
  for (const it of messItems) {
    const cat = it.categoryNameSnapshot || "অন্যান্য";
    // filter by target month if specified
    if (targetYM) {
      const entry = markets.find((e) => e.id === it.entryId);
      if (!entry || !entry.date.startsWith(targetYM)) continue;
    }
    categorySpend[cat] = (categorySpend[cat] || 0) + it.totalPaisa / 100;
  }

  // Deposit trend monthly
  const depositMonthly: Record<string, number> = {};
  for (const d of deps.filter((r) => r.status === "active")) {
    const ym = d.date.slice(0, 7);
    depositMonthly[ym] = (depositMonthly[ym] || 0) + d.amountPaisa / 100;
  }
  const depositTrend = Object.keys(depositMonthly).sort().slice(-12).map((ym) => ({ ym, amount: depositMonthly[ym] }));

  return NextResponse.json({
    dailyTrend,
    monthlyTrend,
    memberMealComp,
    categorySpend: Object.entries(categorySpend).map(([name, value]) => ({ name, value })),
    depositTrend,
    marketVsOther: {
      market: markets.filter((r) => r.status === "active").reduce((a, r) => a + r.finalPaisa / 100, 0),
      other: exps.filter((r) => r.status === "approved").reduce((a, r) => a + r.amountPaisa / 100, 0),
    },
  });
}
