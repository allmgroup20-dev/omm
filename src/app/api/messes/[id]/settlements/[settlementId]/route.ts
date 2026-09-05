import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { monthlySettlements, memberSettlements, messMembers, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; settlementId: string }> }) {
  const { id, settlementId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0]) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sett = await db.select().from(monthlySettlements).where(and(eq(monthlySettlements.id, settlementId), eq(monthlySettlements.messId, id))).limit(1);
  if (!sett[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const members = await db.select({ ms: memberSettlements, member: messMembers, user: users }).from(memberSettlements)
    .innerJoin(messMembers, eq(memberSettlements.memberId, messMembers.id))
    .innerJoin(users, eq(messMembers.userId, users.id))
    .where(eq(memberSettlements.settlementId, settlementId));

  return NextResponse.json({
    settlement: sett[0],
    members: members.map((r) => ({
      id: r.ms.id,
      memberId: r.ms.memberId,
      fullName: r.user.fullName,
      email: r.user.email,
      totalMeals: r.ms.totalMealsScaled / 100,
      totalMealsScaled: r.ms.totalMealsScaled,
      mealCostPaisa: r.ms.mealCostPaisa,
      allocatedExpensePaisa: r.ms.allocatedExpensePaisa,
      previousBalancePaisa: r.ms.previousBalancePaisa,
      depositPaisa: r.ms.depositPaisa,
      adjustmentPaisa: r.ms.adjustmentPaisa,
      closingBalancePaisa: r.ms.closingBalancePaisa,
      status: r.ms.status,
    })),
  });
}
