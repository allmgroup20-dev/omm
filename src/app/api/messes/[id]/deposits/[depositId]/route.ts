import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { deposits, messMembers, ledgerEntries, auditLogs, monthlySettlements } from "@/db/schema";
import { depositUpdateSchema } from "@/lib/validators-finance";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getMemberBalancePaisa } from "@/lib/finance";
import { createNotification } from "@/lib/notifications";

const MANAGER_ROLES = ["manager", "assistant_manager"];

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; depositId: string }> }) {
  const { id, depositId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0]) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const row = await db.select().from(deposits).where(and(eq(deposits.id, depositId), eq(deposits.messId, id))).limit(1);
  if (!row[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ deposit: row[0] });
}

/** Recompute running balances for a member from scratch (cumulative credit-debit in createdAt order). */
async function recomputeMemberBalances(db: Awaited<ReturnType<typeof getRequestDb>>, messId: string, memberId: string) {
  const rows = await db.select().from(ledgerEntries).where(eq(ledgerEntries.memberId, memberId));
  const mine = rows.filter((r) => r.messId === messId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  let running = 0;
  for (const r of mine) {
    running += (r.creditPaisa || 0) - (r.debitPaisa || 0);
    if (r.balancePaisa !== running) {
      await db.update(ledgerEntries).set({ balancePaisa: running }).where(eq(ledgerEntries.id, r.id));
    }
  }
  return running;
}

async function isMonthClosed(db: Awaited<ReturnType<typeof getRequestDb>>, messId: string, dateStr: string) {
  const year = Number(dateStr.slice(0, 4));
  const month = Number(dateStr.slice(5, 7));
  if (!year || !month) return false;
  const rows = await db
    .select()
    .from(monthlySettlements)
    .where(and(eq(monthlySettlements.messId, messId), eq(monthlySettlements.year, year), eq(monthlySettlements.month, month)))
    .limit(1);
  return rows[0]?.status === "final";
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; depositId: string }> }) {
  const { id, depositId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0] || !MANAGER_ROLES.includes(access[0].role)) return NextResponse.json({ error: "Only manager/assistant can edit or void deposits" }, { status: 403 });

  const body = await req.json().catch(() => null);

  const before = await db.select().from(deposits).where(and(eq(deposits.id, depositId), eq(deposits.messId, id))).limit(1);
  if (!before[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (before[0].status !== "active") return NextResponse.json({ error: "Only active deposits can be edited or voided" }, { status: 400 });

  // ---- Legacy void/reverse flow (kept for compatibility) ----
  if (body && typeof body.status === "string") {
    const { status, reason } = body;
    if (!["voided", "reversed"].includes(status)) return NextResponse.json({ error: "status must be voided/reversed" }, { status: 400 });

    if (await isMonthClosed(db, id, before[0].date)) {
      return NextResponse.json({ error: "Month is closed (final). Reopen settlement first." }, { status: 409 });
    }

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

  // ---- Edit flow: any combination of member/date/amount/method/note ----
  const parsed = depositUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;
  const prev = before[0];

  const newMemberId = data.memberId ?? prev.memberId;
  const newDate = data.date ?? prev.date;
  const newAmountPaisa = data.amount !== undefined ? Math.round(data.amount * 100) : prev.amountPaisa;
  if (newAmountPaisa <= 0) return NextResponse.json({ error: "Amount must be >0" }, { status: 400 });

  // member must belong to this mess
  if (newMemberId !== prev.memberId) {
    const mem = await db.select().from(messMembers).where(and(eq(messMembers.id, newMemberId), eq(messMembers.messId, id))).limit(1);
    if (!mem[0]) return NextResponse.json({ error: "Member not in mess" }, { status: 400 });
  }

  // closed-month guard on BOTH old and new dates
  if (await isMonthClosed(db, id, prev.date)) {
    return NextResponse.json({ error: "Original month is closed (final). Reopen settlement first." }, { status: 409 });
  }
  if (newDate !== prev.date && (await isMonthClosed(db, id, newDate))) {
    return NextResponse.json({ error: "Target month is closed (final). Reopen settlement first." }, { status: 409 });
  }

  const newPaymentMethod = data.paymentMethod ?? prev.paymentMethod;
  const newNote = data.note !== undefined ? (data.note.trim() || null) : prev.note;
  const newTxnId = data.transactionId !== undefined ? (data.transactionId.trim() || null) : prev.transactionId;
  const newReceiptUrl = data.receiptUrl !== undefined ? (data.receiptUrl.trim() || null) : prev.receiptUrl;
  const newReceivedBy = data.receivedBy !== undefined ? (data.receivedBy || null) : prev.receivedBy;

  const now = new Date().toISOString();
  await db
    .update(deposits)
    .set({
      memberId: newMemberId,
      date: newDate,
      amountPaisa: newAmountPaisa,
      paymentMethod: newPaymentMethod,
      note: newNote,
      transactionId: newTxnId,
      receiptUrl: newReceiptUrl,
      receivedBy: newReceivedBy,
      updatedAt: now,
    })
    .where(eq(deposits.id, depositId));

  // ---- Ledger: update the original deposit entry in place, then cascade balances ----
  const origLedgers = await db.select().from(ledgerEntries).where(eq(ledgerEntries.refId, depositId));
  const orig = origLedgers
    .filter((r) => r.messId === id && r.refType === "deposit" && r.type === "deposit")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];

  const memberChanged = newMemberId !== prev.memberId;
  if (orig) {
    await db
      .update(ledgerEntries)
      .set({
        memberId: newMemberId,
        date: newDate,
        creditPaisa: newAmountPaisa,
        description: `Deposit ৳${(newAmountPaisa / 100).toFixed(2)} (${newPaymentMethod})`,
      })
      .where(eq(ledgerEntries.id, orig.id));
  } else {
    // legacy row without a linked ledger entry — create one so totals stay correct
    await db.insert(ledgerEntries).values({
      id: nanoid(),
      messId: id,
      memberId: newMemberId,
      date: newDate,
      type: "deposit",
      description: `Deposit ৳${(newAmountPaisa / 100).toFixed(2)} (${newPaymentMethod})`,
      debitPaisa: 0,
      creditPaisa: newAmountPaisa,
      balancePaisa: 0, // fixed by recompute below
      refType: "deposit",
      refId: depositId,
      createdAt: now,
    });
  }

  // Cascade: recompute running balances for affected member(s).
  // Single-entry update keeps monthly sums (type=deposit by date) exact;
  // recompute keeps the running-balance chain exact for later entries.
  await recomputeMemberBalances(db, id, newMemberId);
  if (memberChanged) await recomputeMemberBalances(db, id, prev.memberId);

  await db.insert(auditLogs).values({
    id: nanoid(),
    messId: id,
    actorId: user.id,
    action: "update",
    entityType: "deposit",
    entityId: depositId,
    beforeJson: JSON.stringify(prev),
    afterJson: JSON.stringify({ memberId: newMemberId, date: newDate, amountPaisa: newAmountPaisa, paymentMethod: newPaymentMethod, note: newNote, transactionId: newTxnId }),
    reason: data.reason,
    createdAt: now,
  });

  // notify the (new) member if they have an account and amount/member changed
  try {
    if (newAmountPaisa !== prev.amountPaisa || memberChanged) {
      const memRows = await db.select().from(messMembers).where(eq(messMembers.id, newMemberId)).limit(1);
      const memUserId = memRows[0]?.userId;
      if (memUserId) {
        await createNotification({
          userId: memUserId,
          messId: id,
          type: "deposit",
          title: `Deposit updated to ৳${(newAmountPaisa / 100).toFixed(2)}`,
          body: `${newDate} — ${data.reason}`,
          link: `/messes/${id}/finance/deposits`,
        });
      }
    }
  } catch {}

  const after = await db.select().from(deposits).where(eq(deposits.id, depositId)).limit(1);
  const balancePaisa = await getMemberBalancePaisa(id, newMemberId);
  return NextResponse.json({ ok: true, deposit: after[0], balancePaisa });
}
