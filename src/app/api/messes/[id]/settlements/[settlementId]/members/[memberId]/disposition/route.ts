import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { monthlySettlements, memberSettlements, messMembers, deposits, ledgerEntries, settlementAdjustments, auditLogs } from "@/db/schema";
import { carryDepositTarget, canRecordCarry, canRecordRefund } from "@/lib/settlement";
import { getMemberBalancePaisa } from "@/lib/finance";
import { createNotification } from "@/lib/notifications";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

type Ctx = { params: Promise<{ id: string; settlementId: string; memberId: string }> };

async function latestDisposition(db: Awaited<ReturnType<typeof getRequestDb>>, settlementId: string, memberId: string) {
  const rows = await db.select().from(settlementAdjustments).where(eq(settlementAdjustments.settlementId, settlementId));
  const mine = rows
    .filter((a) => a.memberId === memberId && (a.kind === "carry" || a.kind === "refund"))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return mine.length ? mine[mine.length - 1] : null;
}

async function activeDeposit(db: Awaited<ReturnType<typeof getRequestDb>>, depositId: string | null) {
  if (!depositId) return null;
  const rows = await db.select().from(deposits).where(eq(deposits.id, depositId)).limit(1);
  return rows[0] && rows[0].status === "active" ? rows[0] : null;
}

export async function GET(_req: Request, { params }: Ctx) {
  const { id, settlementId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0]) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await db.select().from(settlementAdjustments).where(eq(settlementAdjustments.settlementId, settlementId));
  return NextResponse.json({ adjustments: rows });
}

/**
 * Advance disposition (closing > 0 only). Two explicit options:
 *
 * - carry: creates a REAL deposit dated the 1st of next month
 *   ("আগের মাসের উদ্বৃত্ত জমা (YYYY-MM)") + an offset adjustment (−closing)
 *   so the next opening doesn't double-count. Net October effect: +closing once.
 * - refund: voids the carry deposit if one is still active, then records a
 *   −closing adjustment so the next opening becomes 0 (cash handed back).
 *
 * Latest disposition per member wins. Source month numbers never change.
 * Works on draft AND final settlements.
 */
export async function POST(req: Request, { params }: Ctx) {
  const { id, settlementId, memberId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0] || access[0].role !== "manager") return NextResponse.json({ error: "Only manager can record disposition" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const kind = body?.kind;
  if (kind !== "carry" && kind !== "refund") {
    return NextResponse.json({ error: "kind must be carry|refund" }, { status: 400 });
  }
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 200) : "";

  const sett = await db
    .select()
    .from(monthlySettlements)
    .where(and(eq(monthlySettlements.id, settlementId), eq(monthlySettlements.messId, id)))
    .limit(1);
  if (!sett[0]) return NextResponse.json({ error: "Settlement not found" }, { status: 404 });
  const memSett = await db
    .select()
    .from(memberSettlements)
    .where(and(eq(memberSettlements.settlementId, settlementId), eq(memberSettlements.memberId, memberId)))
    .limit(1);
  if (!memSett[0]) return NextResponse.json({ error: "Member not in this settlement" }, { status: 404 });

  const closing = memSett[0].closingBalancePaisa;
  if (closing <= 0) {
    return NextResponse.json({ error: "Only positive advances can be carried or refunded" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const prev = await latestDisposition(db, settlementId, memberId);

  if (kind === "carry") {
    const linkedActive = !!(prev?.kind === "carry" && prev.refId && (await activeDeposit(db, prev.refId)));
    if (!canRecordCarry(prev ? { kind: prev.kind, refActive: linkedActive } : null)) {
      return NextResponse.json({ error: "Already carried to next month" }, { status: 400 });
    }
    const target = carryDepositTarget(sett[0].year, sett[0].month);
    const depId = nanoid();
    const adjId = nanoid();
    await db.insert(deposits).values({
      id: depId,
      messId: id,
      memberId,
      date: target.date,
      amountPaisa: closing,
      paymentMethod: "other",
      receivedBy: user.id,
      transactionId: null,
      note: target.note,
      receiptUrl: null,
      clientRefId: `carry-${adjId}`,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    const prevBal = await getMemberBalancePaisa(id, memberId);
    await db.insert(ledgerEntries).values({
      id: nanoid(),
      messId: id,
      memberId,
      date: target.date,
      type: "deposit",
      description: `${target.note} ৳${(closing / 100).toFixed(2)}`,
      debitPaisa: 0,
      creditPaisa: closing,
      balancePaisa: prevBal + closing,
      refType: "deposit",
      refId: depId,
      createdAt: now,
    });
    await db.insert(settlementAdjustments).values({
      id: adjId,
      settlementId,
      memberId,
      amountPaisa: -closing,
      kind: "carry",
      refId: depId,
      reason: note || `Carried advance ৳${(closing / 100).toFixed(2)} to ${target.periodYm} as deposit ${depId}`,
      createdBy: user.id,
      createdAt: now,
    });
    await db.insert(auditLogs).values({
      id: nanoid(),
      messId: id,
      actorId: user.id,
      action: "disposition",
      entityType: "member_settlement",
      entityId: memSett[0].id,
      beforeJson: JSON.stringify({ closingBalancePaisa: closing }),
      afterJson: JSON.stringify({ kind, amountPaisa: -closing, depositId: depId, depositDate: target.date }),
      reason: note || null,
      createdAt: now,
    });
    try {
      const memRows = await db.select().from(messMembers).where(eq(messMembers.id, memberId)).limit(1);
      if (memRows[0]?.userId) {
        await createNotification({
          userId: memRows[0].userId,
          messId: id,
          type: "deposit",
          title: `Advance ৳${(closing / 100).toFixed(2)} carried to ${target.periodYm}`,
          body: target.note,
          link: `/messes/${id}/finance/deposits`,
        });
      }
    } catch {}
    return NextResponse.json({ ok: true, kind, depositId: depId, depositDate: target.date, amountPaisa: closing });
  }

  // refund
  if (!canRecordRefund(prev ? { kind: prev.kind, refActive: false } : null)) {
    return NextResponse.json({ error: "Already refunded" }, { status: 400 });
  }
  let voidedDepositId: string | null = null;
  if (prev?.kind === "carry" && prev.refId) {
    const dep = await activeDeposit(db, prev.refId);
    if (dep) {
      await db.update(deposits).set({ status: "reversed", updatedAt: now }).where(eq(deposits.id, dep.id));
      const bal = await getMemberBalancePaisa(id, memberId);
      await db.insert(ledgerEntries).values({
        id: nanoid(),
        messId: id,
        memberId,
        date: now.slice(0, 10),
        type: "adjustment",
        description: `Reversal of carried advance deposit ${dep.id} (refund)`,
        debitPaisa: dep.amountPaisa,
        creditPaisa: 0,
        balancePaisa: bal - dep.amountPaisa,
        refType: "deposit",
        refId: dep.id,
        createdAt: now,
      });
      await db.insert(auditLogs).values({
        id: nanoid(),
        messId: id,
        actorId: user.id,
        action: "void",
        entityType: "deposit",
        entityId: dep.id,
        beforeJson: JSON.stringify({ status: "active", amountPaisa: dep.amountPaisa }),
        afterJson: JSON.stringify({ status: "reversed" }),
        reason: "Advance refunded in cash",
        createdAt: now,
      });
      voidedDepositId = dep.id;
    }
  }
  await db.insert(settlementAdjustments).values({
    id: nanoid(),
    settlementId,
    memberId,
    amountPaisa: -closing,
    kind: "refund",
    refId: voidedDepositId,
    reason: note || `Cash refund of advance ৳${(closing / 100).toFixed(2)}`,
    createdBy: user.id,
    createdAt: now,
  });
  await db.insert(auditLogs).values({
    id: nanoid(),
    messId: id,
    actorId: user.id,
    action: "disposition",
    entityType: "member_settlement",
    entityId: memSett[0].id,
    beforeJson: JSON.stringify({ closingBalancePaisa: closing }),
    afterJson: JSON.stringify({ kind, amountPaisa: -closing, voidedDepositId }),
    reason: note || null,
    createdAt: now,
  });
  return NextResponse.json({ ok: true, kind, amountPaisa: -closing, voidedDepositId });
}
