import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { messMembers, mealRecords, deposits, ledgerEntries } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { computeMonthlyFinance } from "@/lib/finance";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getRequestDb();
  const user = await getCurrentUser();
  // public GET — if no user, return guest zeros (dashboard shows 0)
  if (!user) {
    return NextResponse.json({ todayMeals: 0, monthMeals: 0, mealRatePaisa: 0, monthMealCostPaisa: 0, totalDepositPaisa: 0, monthDepositPaisa: 0, currentBalancePaisa: 0, dueAdvance: "guest", recentLedger: [], targetMemberId: null, guest: true });
  }
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0]) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const memberIdParam = url.searchParams.get("memberId");
  // member can only query own; manager can query any
  let targetMemberId: string;
  if (memberIdParam && ["manager", "assistant_manager"].includes(access[0].role)) {
    targetMemberId = memberIdParam;
  } else {
    targetMemberId = access[0].id; // own messMember id
  }

  const ymParam = url.searchParams.get("ym");
  const ym = ymParam && /^\d{4}-\d{2}$/.test(ymParam) ? ymParam : new Date().toISOString().slice(0, 7);
  const today = `${ym}-01`;
  const year = Number(ym.slice(0, 4));
  const month = Number(ym.slice(5, 7));

  const mealRows = await db.select().from(mealRecords).where(eq(mealRecords.messId, id));
  const todayMeals = mealRows.filter((r) => r.memberId === targetMemberId && r.date === today).reduce((a, r) => a + r.quantityScaled / 100, 0);
  const monthMeals = mealRows.filter((r) => r.memberId === targetMemberId && r.date.startsWith(ym)).reduce((a, r) => a + r.quantityScaled / 100, 0);

  const finance = await computeMonthlyFinance(id, year, month);
  const mealRatePaisa = finance.mealRatePaisa;
  const monthMealCost = monthMeals * (mealRatePaisa / 100);

  const depRows = await db.select().from(deposits).where(eq(deposits.messId, id));
  const memberDeposits = depRows.filter((r) => r.memberId === targetMemberId && r.status === "active");
  const totalDepositPaisa = memberDeposits.reduce((a, r) => a + r.amountPaisa, 0);
  const monthDepositPaisa = memberDeposits.filter((r) => r.date.startsWith(ym)).reduce((a, r) => a + r.amountPaisa, 0);

  const ledgers = await db.select().from(ledgerEntries).where(eq(ledgerEntries.memberId, targetMemberId));
  const sorted = ledgers.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const currentBalancePaisa = sorted.length ? sorted[sorted.length - 1].balancePaisa : 0;
  const dueAdvance = currentBalancePaisa < 0 ? "due" : currentBalancePaisa > 0 ? "advance" : "settled";

  const recentLedger = sorted.slice(-5).reverse();

  return NextResponse.json({
    todayMeals,
    monthMeals,
    mealRatePaisa,
    mealRateBDT: mealRatePaisa / 100,
    monthMealCostPaisa: Math.round(monthMealCost * 100),
    totalDepositPaisa,
    monthDepositPaisa,
    currentBalancePaisa,
    dueAdvance,
    recentLedger,
    targetMemberId,
  });
}
