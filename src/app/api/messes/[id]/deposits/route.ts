import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { deposits, messMembers, ledgerEntries, auditLogs } from "@/db/schema";
import { depositSchema } from "@/lib/validators-finance";
import { and, eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getMemberBalancePaisa } from "@/lib/finance";
import { createNotification } from "@/lib/notifications";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getRequestDb();
  const user = await getCurrentUser();
  // public GET for dashboard share — allow unauthenticated read-only
  if (user) {
    const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
    // don't block public
  }

  const url = new URL(req.url);
  const memberId = url.searchParams.get("memberId");
  const limit = Math.min(Number(url.searchParams.get("limit") || 100), 200);
  const offset = Number(url.searchParams.get("offset") || 0);

  let rows = await db.select().from(deposits).where(eq(deposits.messId, id)).orderBy(desc(deposits.createdAt)).limit(limit).offset(offset);
  if (memberId) rows = rows.filter((r) => r.memberId === memberId);
  // hide voided by default? include but client filters
  return NextResponse.json({ deposits: rows, total: rows.length });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0] || !["manager", "assistant_manager"].includes(access[0].role)) return NextResponse.json({ error: "Forbidden — only manager/assistant can add deposit" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = depositSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;
  const amountPaisa = Math.round(data.amount * 100);
  if (amountPaisa <= 0) return NextResponse.json({ error: "Amount must be >0" }, { status: 400 });

  // validate member
  const mem = await db.select().from(messMembers).where(and(eq(messMembers.id, data.memberId), eq(messMembers.messId, id))).limit(1);
  if (!mem[0]) return NextResponse.json({ error: "Member not in mess" }, { status: 400 });

  if (data.clientRefId) {
    const existing = await db.select().from(deposits).where(eq(deposits.clientRefId, data.clientRefId)).limit(1);
    if (existing[0]) return NextResponse.json({ error: "Duplicate (clientRefId)" }, { status: 409 });
  }
  if (data.receivedBy) {
    const rb = await db.select().from(messMembers).where(and(eq(messMembers.id, data.receivedBy), eq(messMembers.messId, id))).limit(1);
    // allow receivedBy to be any member id, not necessarily validated strictly
    if (!rb[0] && data.receivedBy !== user.id) {
      // still allow user id as fallback
    }
  }

  const now = new Date().toISOString();
  const depId = nanoid();
  await db.insert(deposits).values({
    id: depId,
    messId: id,
    memberId: data.memberId,
    date: data.date,
    amountPaisa,
    paymentMethod: data.paymentMethod || "cash",
    receivedBy: data.receivedBy || user.id,
    transactionId: data.transactionId?.trim() || null,
    note: data.note?.trim() || null,
    receiptUrl: data.receiptUrl?.trim() || null,
    clientRefId: data.clientRefId || null,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });

  // ledger entry: credit
  const prevBalance = await getMemberBalancePaisa(id, data.memberId);
  const newBalance = prevBalance + amountPaisa;
  await db.insert(ledgerEntries).values({
    id: nanoid(),
    messId: id,
    memberId: data.memberId,
    date: data.date,
    type: "deposit",
    description: `Deposit ৳${(amountPaisa / 100).toFixed(2)} (${data.paymentMethod || "cash"})`,
    debitPaisa: 0,
    creditPaisa: amountPaisa,
    balancePaisa: newBalance,
    refType: "deposit",
    refId: depId,
    createdAt: now,
  });

  await db.insert(auditLogs).values({ id: nanoid(), messId: id, actorId: user.id, action: "create", entityType: "deposit", entityId: depId, afterJson: JSON.stringify({ amountPaisa }), createdAt: now });

  // notify member (skip placeholders — no account to notify yet)
  try {
    const memUserId = mem[0].userId;
    if (memUserId) {
      await createNotification({ userId: memUserId, messId: id, type: "deposit", title: `Deposit ৳${(amountPaisa / 100).toFixed(2)} received`, body: `${data.date} — ${data.paymentMethod || "cash"}`, link: `/messes/${id}/finance/deposits` });
    }
  } catch {}

  const row = await db.select().from(deposits).where(eq(deposits.id, depId)).limit(1);
  return NextResponse.json({ ok: true, deposit: row[0], balancePaisa: newBalance });
}
