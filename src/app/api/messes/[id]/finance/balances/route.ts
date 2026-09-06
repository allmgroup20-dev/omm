import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { messMembers, ledgerEntries, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { computeMonthlyFinance } from "@/lib/finance";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0]) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const year = Number(url.searchParams.get("year"));
  const month = Number(url.searchParams.get("month"));
  if (!year || !month) return NextResponse.json({ error: "year and month required" }, { status: 400 });

  const members = await db.select().from(messMembers).where(eq(messMembers.messId, id));
  const finance = await computeMonthlyFinance(id, year, month);
  const { mealRatePaisa } = finance;

  // ledger balances per member (current)
  const ledgerRows = await db.select().from(ledgerEntries).where(eq(ledgerEntries.messId, id));
  // map userId -> fullName for display
  const userRows = await db.select().from(users);
  const userMap = new Map(userRows.map((u) => [u.id, u.fullName]));

  const result: { memberId: string; userId: string | null; displayName: string; totalMeals: number; mealCostPaisa: number; depositPaisa: number; balancePaisa: number; status: string }[] = [];

  for (const m of members) {
    const mealsScaled = finance.monthMeals.filter((r) => r.memberId === m.id).reduce((a, r) => a + r.quantityScaled, 0);
    const mealCostPaisa = Math.round((mealsScaled * mealRatePaisa) / 100); // scaled * rate /100
    // deposits for this month + previous ledger balance? For now use ledger balance as proxy for deposits
    const memberLedger = ledgerRows.filter((r) => r.memberId === m.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const currentBalance = memberLedger.length ? memberLedger[memberLedger.length - 1].balancePaisa : 0;
    // deposit for month: sum of deposit-type ledger credits in month
    const mm = String(month).padStart(2, "0");
    const prefix = `${year}-${mm}-`;
    const monthDeposits = memberLedger.filter((r) => r.type === "deposit" && r.date.startsWith(prefix)).reduce((a, r) => a + r.creditPaisa, 0);

    // Closing balance = previousBalance + deposits - mealCost - allocatedOther (for now 0)
    // For simplicity, show due/advance based on: deposit vs mealCost
    // If deposits >= mealCost => advance, else due
    const net = monthDeposits - mealCostPaisa;
    // include previous balance carry? Use currentBalance - monthDeposits + mealCost? But for now show net
    // We'll also expose currentBalance
    let status: string;
    if (net > 0) status = "advance";
    else if (net < 0) status = "due";
    else status = "settled";

    const displayName = (m.displayName?.trim() || (m.userId ? userMap.get(m.userId) : null) || m.id.slice(0, 6)) as string;
    result.push({
      memberId: m.id,
      userId: m.userId,
      displayName,
      totalMeals: mealsScaled / 100,
      mealCostPaisa,
      depositPaisa: monthDeposits,
      balancePaisa: currentBalance,
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
