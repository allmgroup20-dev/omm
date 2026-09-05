import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { expenses, expenseApprovals, messMembers, auditLogs } from "@/db/schema";
import { approvalSchema } from "@/lib/validators-expense";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function POST(req: Request, { params }: { params: Promise<{ id: string; expenseId: string }> }) {
  const { id, expenseId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0] || access[0].role !== "manager") return NextResponse.json({ error: "Only manager can approve" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = approvalSchema.safeParse(body || {});
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });

  const expRows = await db.select().from(expenses).where(and(eq(expenses.id, expenseId), eq(expenses.messId, id))).limit(1);
  if (!expRows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (expRows[0].status !== "pending") return NextResponse.json({ error: `Not pending (is ${expRows[0].status})` }, { status: 400 });

  const now = new Date().toISOString();
  await db.update(expenses).set({ status: "approved", updatedAt: now }).where(eq(expenses.id, expenseId));
  await db.insert(expenseApprovals).values({ id: nanoid(), expenseId, approverId: user.id, status: "approved", note: parsed.data.note?.trim() || null, createdAt: now });
  await db.insert(auditLogs).values({ id: nanoid(), messId: id, actorId: user.id, action: "approve", entityType: "expense", entityId: expenseId, afterJson: JSON.stringify({ status: "approved" }), createdAt: now });
  const after = await db.select().from(expenses).where(eq(expenses.id, expenseId)).limit(1);
  return NextResponse.json({ ok: true, expense: after[0] });
}
