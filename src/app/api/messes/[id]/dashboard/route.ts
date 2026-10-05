import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { messMembers, mealRecords, marketEntries, expenses, deposits, monthlySettlements, messes } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { computeMonthlyFinance } from "@/lib/finance";
import { monthlyNetBalance, cashInHandPaisa, sumMonthDeposits } from "@/lib/money";
import { filterMembersForMonth } from "@/lib/settlement";
import { buildInsights } from "@/lib/dashboard";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getRequestDb();
  // public GET — no auth required for dashboard read-only; write still protected via POST
  const user = await getCurrentUser();
  if (user) {
    const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
    // for public, don't block — just continue; for private, still allow
  }

  const url = new URL(req.url);
  const ymParam = url.searchParams.get("ym");
  const yearParam = url.searchParams.get("year");
  const monthParam = url.searchParams.get("month");
  const nowParam = url.searchParams.get("date"); // legacy YYYY-MM-DD
  let ym: string;
  let year: number;
  let month: number;
  if (ymParam && /^\d{4}-\d{2}$/.test(ymParam)) {
    ym = ymParam;
    year = Number(ym.slice(0, 4));
    month = Number(ym.slice(5, 7));
  } else if (yearParam && monthParam) {
    year = Number(yearParam);
    month = Number(monthParam);
    ym = `${year}-${String(month).padStart(2, "0")}`;
  } else if (nowParam) {
    ym = nowParam.slice(0, 7);
    year = Number(nowParam.slice(0, 4));
    month = Number(nowParam.slice(5, 7));
  } else {
    const d = new Date();
    ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    year = d.getFullYear();
    month = d.getMonth() + 1;
  }
  // today = actual today if ym is current month, otherwise last day of ym; keep dailyTrend full month
  const now = new Date();
  const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const today = ym === currentYm ? now.toISOString().slice(0, 10) : `${ym}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;

  const members = await db.select().from(messMembers).where(eq(messMembers.messId, id));
  const messRow = await db.select().from(messes).where(eq(messes.id, id)).limit(1);
  const messName = messRow[0]?.name || null;
  const activeMembers = members.filter((m) => m.status === "active").length;

  const mealRows = await db.select().from(mealRecords).where(eq(mealRecords.messId, id));
  const todayMeals = mealRows.filter((r) => r.date === today);
  const todayMealsCount = todayMeals.reduce((a, r) => a + r.quantityScaled / 100, 0);

  const markets = await db.select().from(marketEntries).where(eq(marketEntries.messId, id));
  const exps = await db.select().from(expenses).where(eq(expenses.messId, id));
  const deps = await db.select().from(deposits).where(eq(deposits.messId, id));

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

  // Month-scoped deposits: a month's report shows only that month (fresh start).
  const monthDepositPaisa = sumMonthDeposits(deps, ym);
  // Cash in hand (this month): month collections minus month spending.
  const cashInHand = cashInHandPaisa(monthDepositPaisa, monthMarketTotal, monthOtherTotal);
  // due/advance: monthly net per member (month deposits − month meal cost),
  // same formula as finance/balances. Ledger running balances are deposit-only
  // (no meal_cost postings), so they must NOT be used for due/advance here.
  const perMemberBalances: Record<string, number> = {};
  for (const m of filterMembersForMonth(members, year, month)) {
    const mealsScaled = mealRows
      .filter((r) => r.memberId === m.id && r.date.startsWith(`${ym}-`))
      .reduce((a, r) => a + r.quantityScaled, 0);
    const mealCostPaisa = Math.round((mealsScaled * mealRatePaisa) / 100);
    // deposits table is the single source (active only, voided excluded)
    const monthDepositPaisa = sumMonthDeposits(
      deps.filter((r) => r.memberId === m.id),
      ym,
    );
    perMemberBalances[m.id] = monthlyNetBalance(monthDepositPaisa, mealCostPaisa);
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

  const insights = buildInsights({ marketMoM, pendingExpenses, incompleteMeals, dueCount });

  // dailyTrend for the full month — always full month, not last 7 days
  const { getMonthDates } = await import("@/lib/calendar");
  const monthDates = getMonthDates(year, month);
  const dailyTrend: { date: string; market: number; other: number; total: number }[] = monthDates.map((ds) => {
    const mVal = markets.filter((r) => r.date === ds).reduce((a, r) => a + r.finalPaisa, 0) / 100;
    const oVal = exps.filter((r) => r.date === ds).reduce((a, r) => a + r.amountPaisa, 0) / 100;
    return { date: ds.slice(5), market: mVal, other: oVal, total: mVal + oVal };
  });

  const settlements = await db.select().from(monthlySettlements).where(eq(monthlySettlements.messId, id));

  return NextResponse.json({
    ym,
    messName,
    stats: {
      activeMembers,
      todayMeals: todayMealsCount,
      todayMarketPaisa: todayMarket,
      todayOtherPaisa: todayOther,
      todayTotalPaisa: todayTotal,
      mealRatePaisa,
      monthMarketPaisa: monthMarketTotal,
      monthMarketCount: monthMarkets.length,
      monthOtherPaisa: monthOtherTotal,
      monthTotalPaisa: monthExpenseTotal,
      monthDepositPaisa,
      totalDuePaisa: totalDue,
      totalAdvancePaisa: totalAdvance,
      cashInHandPaisa: cashInHand,
    },
    insights,
    dailyTrend,
    recentSettlements: settlements.slice(-3),
  });
}
