import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getDb } from "@/db";
import { monthlySettlements, memberSettlements, messMembers, auditLogs, closingPeriods } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { computeSettlement } from "@/lib/settlement";
import { notifyMessMembers } from "@/lib/notifications";

// GET list
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0]) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const year = url.searchParams.get("year");
  let rows = await db.select().from(monthlySettlements).where(eq(monthlySettlements.messId, id)).orderBy(desc(monthlySettlements.createdAt));
  if (year) rows = rows.filter((r) => String(r.year) === year);
  return NextResponse.json({ settlements: rows });
}

// POST generate settlement for year+month
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0] || access[0].role !== "manager") return NextResponse.json({ error: "Only manager can generate settlement" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const year = Number(body?.year);
  const month = Number(body?.month);
  if (!year || !month || month < 1 || month > 12) return NextResponse.json({ error: "year and month required" }, { status: 400 });

  // check if already closed
  const closedRows = await db.select().from(closingPeriods).where(and(eq(closingPeriods.messId, id), eq(closingPeriods.year, year), eq(closingPeriods.month, month))).limit(1);
  if (closedRows[0]?.status === "closed") return NextResponse.json({ error: "Month is closed, reopen first to regenerate" }, { status: 409 });

  const computed = await computeSettlement(id, year, month);

  // upsert settlement
  const existing = await db.select().from(monthlySettlements).where(and(eq(monthlySettlements.messId, id), eq(monthlySettlements.year, year), eq(monthlySettlements.month, month))).limit(1);
  const now = new Date().toISOString();
  let settlementId: string;
  if (existing[0]) {
    settlementId = existing[0].id;
    await db.update(monthlySettlements).set({
      totalMarketPaisa: computed.totalMarketPaisa,
      totalOtherExpensePaisa: computed.totalOtherPaisa,
      totalFoodCostPaisa: computed.totalFoodCostPaisa,
      totalMealsScaled: computed.totalMealsScaled,
      mealRatePaisa: computed.mealRatePaisa,
      status: "draft",
      updatedAt: now,
    }).where(eq(monthlySettlements.id, settlementId));
    // delete old member settlements to regenerate
    await db.delete(memberSettlements).where(eq(memberSettlements.settlementId, settlementId));
  } else {
    settlementId = nanoid();
    await db.insert(monthlySettlements).values({
      id: settlementId,
      messId: id,
      year,
      month,
      totalMarketPaisa: computed.totalMarketPaisa,
      totalOtherExpensePaisa: computed.totalOtherPaisa,
      totalFoodCostPaisa: computed.totalFoodCostPaisa,
      totalMealsScaled: computed.totalMealsScaled,
      mealRatePaisa: computed.mealRatePaisa,
      status: "draft",
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
    });
  }

  // insert member settlements
  for (const m of computed.members) {
    const bm = computed.byMember[m.id];
    const allocated = computed.allocatedExpenseMap[m.id] || 0;
    const closing = computed.closingMap[m.id];
    await db.insert(memberSettlements).values({
      id: nanoid(),
      settlementId,
      memberId: m.id,
      totalMealsScaled: bm.mealsScaled,
      mealCostPaisa: bm.mealCostPaisa,
      allocatedExpensePaisa: allocated,
      previousBalancePaisa: bm.previousBalance,
      depositPaisa: bm.depositPaisa,
      adjustmentPaisa: 0,
      closingBalancePaisa: closing.closing,
      status: closing.status as never,
      createdAt: now,
    });
  }

  await db.insert(auditLogs).values({ id: nanoid(), messId: id, actorId: user.id, action: "create", entityType: "settlement", entityId: settlementId, afterJson: JSON.stringify({ year, month, mealRatePaisa: computed.mealRatePaisa }), createdAt: now });

  try {
    await notifyMessMembers(id, "settlement", `Settlement ready ${year}-${String(month).padStart(2, "0")} — Rate ৳${(computed.mealRatePaisa / 100).toFixed(2)}`, `Total meals ${computed.totalMealsScaled / 100}`, `/messes/${id}/settlements/${settlementId}`, user.id);
  } catch {}

  const settlement = await db.select().from(monthlySettlements).where(eq(monthlySettlements.id, settlementId)).limit(1);
  const members = await db.select().from(memberSettlements).where(eq(memberSettlements.settlementId, settlementId));
  return NextResponse.json({ ok: true, settlement: settlement[0], members });
}
