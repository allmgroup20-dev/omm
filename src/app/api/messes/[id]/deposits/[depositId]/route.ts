import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getDb } from "@/db";
import { deposits, messMembers, ledgerEntries, auditLogs } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getMemberBalancePaisa } from "@/lib/finance";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; depositId: string }> }) {
  const { id, depositId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0]) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const row = await db.select().from(deposits).where(and(eq(deposits.id, depositId), eq(deposits.messId, id))).limit(1);
  if (!row[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ deposit: row[0] });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; depositId: string }> }) {
  const { id, depositId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0] || access[0].role !== "manager") return NextResponse.json({ error: "Only manager can void" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const { status, reason } = body || {};
  if (!["voided", "reversed"].includes(status)) return NextResponse.json({ error: "status must be voided/reversed" }, { status: 400 });

  const before = await db.select().from(deposits).where(and(eq(deposits.id, depositId), eq(deposits.messId, id))).limit(1);
  if (!before[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (before[0].status !== "active") return NextResponse.json({ error: "Already voided" }, { status: 400 });

  const now = new Date().toISOString();
  await db.update(deposits).set({ status, updatedAt: now }).where(eq(deposits.id, depositId));

  // reversal ledger entry: debit
  const prevBalance = await getMemberBalancePaisa(id, before[0].memberId);
  const newBalance = prevBalance - before[0].amountPaisa;
  await db.insert(ledgerEntries).values({
    id: nanoid(),
    messId: id,
    memberId: before[0].memberId,
    date: now.slice(0, 10),
    type: "adjustment",
    description: `Reversal of deposit ${depositId} (${status})`,
    debitPaisa: before[0].amountPaisa,
    creditPaisa: 0,
    balancePaisa: newBalance,
    refType: "deposit",
    refId: depositId,
    createdAt: now,
  });

  await db.insert(auditLogs).values({ id: nanoid(), messId: id, actorId: user.id, action: "void", entityType: "deposit", entityId: depositId, beforeJson: JSON.stringify(before[0]), afterJson: JSON.stringify({ status }), reason: reason || null, createdAt: now });
  const after = await db.select().from(deposits).where(eq(deposits.id, depositId)).limit(1);
  return NextResponse.json({ ok: true, deposit: after[0], balancePaisa: newBalance });
}
