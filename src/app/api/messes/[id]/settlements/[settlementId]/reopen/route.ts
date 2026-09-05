import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { monthlySettlements, closingPeriods, messMembers, auditLogs } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function POST(req: Request, { params }: { params: Promise<{ id: string; settlementId: string }> }) {
  const { id, settlementId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0] || access[0].role !== "manager") return NextResponse.json({ error: "Only manager can reopen" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const reason = body?.reason?.trim() || "No reason";

  const sett = await db.select().from(monthlySettlements).where(and(eq(monthlySettlements.id, settlementId), eq(monthlySettlements.messId, id))).limit(1);
  if (!sett[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { year, month } = sett[0];
  const closeRows = await db.select().from(closingPeriods).where(and(eq(closingPeriods.messId, id), eq(closingPeriods.year, year), eq(closingPeriods.month, month))).limit(1);
  if (!closeRows[0] || closeRows[0].status !== "closed") return NextResponse.json({ error: "Not closed" }, { status: 400 });

  const now = new Date().toISOString();
  await db.update(closingPeriods).set({ status: "open", reopenedBy: user.id, reopenedAt: now, reopenReason: reason }).where(eq(closingPeriods.id, closeRows[0].id));
  await db.update(monthlySettlements).set({ status: "draft", updatedAt: now }).where(eq(monthlySettlements.id, settlementId));
  await db.insert(auditLogs).values({ id: nanoid(), messId: id, actorId: user.id, action: "reopen", entityType: "settlement", entityId: settlementId, reason, createdAt: now });
  return NextResponse.json({ ok: true });
}
