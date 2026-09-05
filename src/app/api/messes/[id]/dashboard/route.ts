import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getDb } from "@/db";
import { messMembers, mealRecords, marketEntries, expenses, deposits, ledgerEntries, monthlySettlements } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { computeMonthlyFinance } from "@/lib/finance";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0]) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const nowParam = url.searchParams.get("date"); // YYYY-MM-DD override for testing
  const today = nowParam || new Date().toISOString().slice(0, 10);
  const ym = today.slice(0, 7); // YYYY-MM
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));

  const members = await db.select().from(messMembers).where(eq(messMembers.messId, id));
  const activeMembers = members.filter((m) => m.status === "active").length;

  const meals = await db.select().from(marketEntries).where(eq(marketEntries.messId, id)); // placeholder for meal check
  const mealRows = await db.select().from(mealRecords).where(eq(mealRecords.messId, id));
  const todayMeals = mealRows.filter((r) => r.date === today);
  const todayMealsCount = todayMeals.reduce((a, r) => a + r.quantityScaled / 100, 0);

  const markets = await db.select().from(marketEntries).where(eq(marketEntries.messId, id));
  const exps = await db.select().from(expenses).where(eq(expenses.messId, id));
  const deps = await db.select().from(deposits).where(eq(deposits.messId, id));
  const ledgers = await db.select().from(ledgerEntries).where(eq(ledgerEntries.messId, id));

  const todayMarket = markets.filter((r) => r.date === today && r.status === "active").reduce((a, r) => a + r.finalPaisa, 0);
  const todayOther = exps.filter((r) => r.date === today && r.status === "approved").reduce((a, r) => a + r.amountPaisa, 0);
  const todayTotal = todayMarket + todayOther;

  const monthMarkets = markets.filter((r) => r.date.startsWith(ym) && r.status === "active");
  const monthExps = exps.filter((r) => r.date.startsWith(ym) && r.status === "approved");
  const monthMarketTotal = monthMarkets.reduce((a, r) => a + r.finalPaisa, 0);
  const monthOtherTotal = monthExps.reduce((a, r) => a + r.amountPaisa, 0);
  const monthExpenseTotal = monthMarketTotal + monthOtherTotal;

  // meal rate current month
  const finance = await computeMonthlyFinance(id, year, month);
  const mealRatePaisa = finance.mealRatePaisa;

  const totalDeposits = deps.filter((r) => r.status === "active").reduce((a, r) => a + r.amountPaisa, 0);
  // due/advance via balances API logic simplified: use ledger last balance per member
  const perMemberBalances: Record<string, number> = {};
  for (const m of members) {
    const ledgerForMember = ledgers.filter((r) => r.memberId === m.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const bal = ledgerForMember.length ? ledgerForMember[ledgerForMember.length - 1].balancePaisa : 0;
    perMemberBalances[m.id] = bal;
  }
  const totalDue = Object.values(perMemberBalances).filter((b) => b < 0).reduce((a, b) => a + Math.abs(b), 0);
  const totalAdvance = Object.values(perMemberBalances).filter((b) => b > 0).reduce((a, b) => a + b, 0);

  // insights
  const prevMonthDate = new Date(year, month - 2, 1); // previous month
  const prevYM = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;
  const prevMarketTotal = markets.filter((r) => r.date.startsWith(prevYM) && r.status === "active").reduce((a, r) => a + r.finalPaisa, 0);
  const marketMoM = prevMarketTotal ? ((monthMarketTotal - prevMarketTotal) / prevMarketTotal) * 100 : 0;

  const pendingExpenses = exps.filter((r) => r.status === "pending").length;
  const incompletes = 0; // placeholder: members with 0 meals today vs active
  // count active members with no meal today
  const memberIdsWithMealsToday = new Set(todayMeals.map((r) => r.memberId));
  const incompleteMeals = members.filter((m) => m.status === "active" && !memberIdsWithMealsToday.has(m.id)).length;

  // due members count
  const dueCount = Object.values(perMemberBalances).filter((b) => b < 0).length;

  const insights: string[] = [];
  if (Math.abs(marketMoM) >= 1) {
    insights.push(`এই মাসে বাজার খরচ গত মাসের তুলনায় ${marketMoM > 0 ? `${marketMoM.toFixed(1)}% বেশি` : `${Math.abs(marketMoM).toFixed(1)}% কম`}।`);
  }
  if (pendingExpenses) insights.push(`${pendingExpenses}টি খরচ approval-এর অপেক্ষায়।`);
  if (incompleteMeals) insights.push(`${incompleteMeals} জন সদস্যের আজকের মিল এন্ট্রি অসম্পূর্ণ।`);
  if (dueCount) insights.push(`${dueCount} জন সদস্যের Due রয়েছে।`);

  // analytics sparklines for last 7 days
  const dailyTrend: { date: string; market: number; other: number; total: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    const mVal = markets.filter((r) => r.date === ds).reduce((a, r) => a + r.finalPaisa, 0) / 100;
    const oVal = exps.filter((r) => r.date === ds).reduce((a, r) => a + r.amountPaisa, 0) / 100;
    dailyTrend.push({ date: ds.slice(5), market: mVal, other: oVal, total: mVal + oVal });
  }

  const settlements = await db.select().from(monthlySettlements).where(eq(monthlySettlements.messId, id));

  return NextResponse.json({
    stats: {
      activeMembers,
      todayMeals: todayMealsCount,
      todayMarketPaisa: todayMarket,
      todayOtherPaisa: todayOther,
      todayTotalPaisa: todayTotal,
      mealRatePaisa,
      monthMarketPaisa: monthMarketTotal,
      monthOtherPaisa: monthOtherTotal,
      monthTotalPaisa: monthExpenseTotal,
      totalDepositPaisa: totalDeposits,
      totalDuePaisa: totalDue,
      totalAdvancePaisa: totalAdvance,
    },
    insights,
    dailyTrend,
    recentSettlements: settlements.slice(-3),
  });
}
