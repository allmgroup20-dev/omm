import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { messMembers, ledgerEntries, deposits, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { computeMonthlyFinance } from "@/lib/finance";
import { monthlyNetBalance, netBalanceStatus } from "@/lib/money";
import { filterMembersForMonth } from "@/lib/settlement";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getRequestDb();
  // public GET — allow unauthenticated for dashboard share, but still need to verify mess exists
  const user = await getCurrentUser();
  if (user) {
    const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
    // for public, don't block — just continue; for private, still allow
  }

  const url = new URL(req.url);
  const year = Number(url.searchParams.get("year"));
  const month = Number(url.searchParams.get("month"));
  if (!year || !month) return NextResponse.json({ error: "year and month required" }, { status: 400 });

  // Month-window scoping: left members stay till month-end, vanish next month.
  const members = filterMembersForMonth(
    await db.select().from(messMembers).where(eq(messMembers.messId, id)),
    year,
    month,
  );
  const finance = await computeMonthlyFinance(id, year, month);
  const { mealRatePaisa } = finance;

  // ledger balances per member (current)
  const ledgerRows = await db.select().from(ledgerEntries).where(eq(ledgerEntries.messId, id));
  // deposits table is the single source for monthly sums (voided excluded)
  const depRows = await db.select().from(deposits).where(eq(deposits.messId, id));
  // map userId -> fullName for display
  const userRows = await db.select().from(users);
  const userMap = new Map(userRows.map((u) => [u.id, u.fullName]));

  const result: { memberId: string; userId: string | null; displayName: string; totalMeals: number; mealCostPaisa: number; depositPaisa: number; balancePaisa: number; lifetimeBalancePaisa?: number; status: string }[] = [];

  for (const m of members) {
    const mealsScaled = finance.monthMeals.filter((r) => r.memberId === m.id).reduce((a, r) => a + r.quantityScaled, 0);
    const mealCostPaisa = Math.round((mealsScaled * mealRatePaisa) / 100); // scaled * rate /100
    const memberLedger = ledgerRows.filter((r) => r.memberId === m.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const currentBalance = memberLedger.length ? memberLedger[memberLedger.length - 1].balancePaisa : 0;
    // deposit for month: single source = deposits table (active only, voided excluded)
    const mm = String(month).padStart(2, "0");
    const prefix = `${year}-${mm}-`;
    const monthDeposits = depRows
      .filter((d) => d.memberId === m.id && d.status === "active" && d.date.startsWith(prefix))
      .reduce((a, d) => a + d.amountPaisa, 0);

    // Monthly balance = month deposits − month meal cost (+ = advance, − = due).
    // NOTE: ledger holds deposit-only entries (no meal_cost postings), so the
    // lifetime running balance is NOT the monthly balance — don't display it here.
    // Previous-month carry + other-expense allocation live on the settlement page.
    const net = monthlyNetBalance(monthDeposits, mealCostPaisa);
    // include previous balance carry? Use currentBalance - monthDeposits + mealCost? But for now show net
    // We'll also expose currentBalance
    const status = netBalanceStatus(net);

    const displayName = (m.displayName?.trim() || (m.userId ? userMap.get(m.userId) : null) || m.id.slice(0, 6)) as string;
    result.push({
      memberId: m.id,
      userId: m.userId,
      displayName,
      totalMeals: mealsScaled / 100,
      mealCostPaisa,
      depositPaisa: monthDeposits,
      balancePaisa: net,
      lifetimeBalancePaisa: currentBalance,
      status,
    });
  }

  return NextResponse.json({
    year,
    month,
    mealRatePaisa,
    mealRateBDT: mealRatePaisa / 100,
    breakdown: `Meal Rate ৳${(mealRatePaisa / 100).toFixed(2)} (Market ৳${(finance.totalMarketPaisa / 100).toFixed(2)} ÷ ${finance.totalMealsScaled / 100} meals)`,
    members: result,
    totals: {
      totalMeals: finance.totalMealsScaled / 100,
      totalMarketPaisa: finance.totalMarketPaisa,
      totalOtherPaisa: finance.totalOtherPaisa,
    },
  });
}
