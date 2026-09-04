import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getDb } from "@/db";
import { expenses, messMembers, auditLogs } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; expenseId: string }> }) {
  const { id, expenseId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0]) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const row = await db.select().from(expenses).where(and(eq(expenses.id, expenseId), eq(expenses.messId, id))).limit(1);
  if (!row[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ expense: row[0] });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; expenseId: string }> }) {
  const { id, expenseId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0] || !["manager", "assistant_manager"].includes(access[0].role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  // allow void/cancel only, not amount change without audit
  const { status, reason } = body || {};
  if (!["cancelled", "voided"].includes(status)) return NextResponse.json({ error: "Only cancelled/voided allowed via PATCH; use approve/reject for pending" }, { status: 400 });

  const before = await db.select().from(expenses).where(and(eq(expenses.id, expenseId), eq(expenses.messId, id))).limit(1);
  if (!before[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (before[0].status === "voided") return NextResponse.json({ error: "Already voided" }, { status: 400 });

  await db.update(expenses).set({ status, updatedAt: new Date().toISOString() }).where(eq(expenses.id, expenseId));
  await db.insert(auditLogs).values({ id: nanoid(), messId: id, actorId: user.id, action: "update", entityType: "expense", entityId: expenseId, beforeJson: JSON.stringify(before[0]), afterJson: JSON.stringify({ status }), reason: reason || null, createdAt: new Date().toISOString() });
  const after = await db.select().from(expenses).where(eq(expenses.id, expenseId)).limit(1);
  return NextResponse.json({ ok: true, expense: after[0] });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; expenseId: string }> }) {
  // Hard delete forbidden — use void via PATCH. This is soft guard.
  return NextResponse.json({ error: "Hard delete forbidden. Use PATCH to void/cancel." }, { status: 405 });
}
