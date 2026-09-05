import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { monthlySettlements, closingPeriods, messMembers, expenses, auditLogs } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { computeSettlement } from "@/lib/settlement";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string; settlementId: string }> }) {
  const { id, settlementId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0] || access[0].role !== "manager") return NextResponse.json({ error: "Only manager can close" }, { status: 403 });

  const sett = await db.select().from(monthlySettlements).where(and(eq(monthlySettlements.id, settlementId), eq(monthlySettlements.messId, id))).limit(1);
  if (!sett[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { year, month } = sett[0];

  // validations: missing meals? unapproved expenses? etc.
  const warnings: string[] = [];
  const computed = await computeSettlement(id, year, month);
  // Check missing meals: if totalMealsScaled ==0 warning, or if some active member has 0 meals warning
  const zeroMealMembers = computed.members.filter((m) => (computed.byMember[m.id]?.mealsScaled || 0) === 0).map((m) => m.id);
  if (computed.totalMealsScaled === 0) warnings.push("No meals recorded for this month");
  else if (zeroMealMembers.length) warnings.push(`${zeroMealMembers.length} members have 0 meals`);

  const pendingExpenses = await db.select().from(expenses).where(and(eq(expenses.messId, id), eq(expenses.status, "pending")));
  const monthPending = pendingExpenses.filter((e) => e.date.startsWith(`${year}-${String(month).padStart(2, "0")}-`));
  if (monthPending.length) warnings.push(`${monthPending.length} pending expenses`);

  // Still allow close but return warnings; client confirms
  // Check already closed
  const existingClose = await db.select().from(closingPeriods).where(and(eq(closingPeriods.messId, id), eq(closingPeriods.year, year), eq(closingPeriods.month, month))).limit(1);
  if (existingClose[0]?.status === "closed") return NextResponse.json({ error: "Already closed" }, { status: 409 });

  const now = new Date().toISOString();
  if (existingClose[0]) {
    await db.update(closingPeriods).set({ status: "closed", closedBy: user.id, closedAt: now, reopenedBy: null, reopenedAt: null }).where(eq(closingPeriods.id, existingClose[0].id));
  } else {
    await db.insert(closingPeriods).values({ id: nanoid(), messId: id, year, month, status: "closed", closedBy: user.id, closedAt: now, createdAt: now });
  }
  await db.update(monthlySettlements).set({ status: "final", updatedAt: now }).where(eq(monthlySettlements.id, settlementId));
  await db.insert(auditLogs).values({ id: nanoid(), messId: id, actorId: user.id, action: "close", entityType: "settlement", entityId: settlementId, afterJson: JSON.stringify({ year, month }), createdAt: now });

  return NextResponse.json({ ok: true, warnings, settlementId, year, month });
}
