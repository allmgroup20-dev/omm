import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { deposits, messMembers, ledgerEntries, auditLogs, monthlySettlements, memberSettlements, closingPeriods } from "@/db/schema";
import { splitDuePayment } from "@/lib/money";
import { getMemberBalancePaisa } from "@/lib/finance";
import { createNotification } from "@/lib/notifications";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

const collectSchema = z.object({
  memberId: z.string().min(1),
  amount: z.number().min(0.01).max(10000000), // BDT received today
  sourceYm: z.string().regex(/^\d{4}-\d{2}$/), // past month whose due is being paid
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // receipt date, default today
  paymentMethod: z.enum(["cash", "bank", "mobile", "other"]).default("cash").optional(),
  note: z.string().max(500).optional().or(z.literal("")),
});

/**
 * Due collection with automatic split ("বকেয়া জমা"):
 * amount received today against a PAST month's due is split into
 * (1) a deposit dated the source month's last day (up to the remaining due),
 * (2) the remainder as a normal deposit dated today.
 * The source month MUST be open (draft) — final/closed months stay immutable.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0] || !["manager", "assistant_manager"].includes(access[0].role)) {
    return NextResponse.json({ error: "Forbidden — only manager/assistant can collect dues" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = collectSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  const mem = await db.select().from(messMembers).where(and(eq(messMembers.id, data.memberId), eq(messMembers.messId, id))).limit(1);
  if (!mem[0]) return NextResponse.json({ error: "Member not in mess" }, { status: 400 });

  const today = new Date().toISOString().slice(0, 10);
  const receiptDate = data.date || today;
  if (data.sourceYm >= receiptDate.slice(0, 7)) {
    return NextResponse.json({ error: "sourceYm must be a past month (use normal deposit for current dues)" }, { status: 400 });
  }

  const sYear = Number(data.sourceYm.slice(0, 4));
  const sMonth = Number(data.sourceYm.slice(5, 7));
  const sourceEnd = `${data.sourceYm}-${String(new Date(sYear, sMonth, 0).getDate()).padStart(2, "0")}`;

  // source settlement must exist (proves the due) and stay open
  const settRows = await db
    .select()
    .from(monthlySettlements)
    .where(and(eq(monthlySettlements.messId, id), eq(monthlySettlements.year, sYear), eq(monthlySettlements.month, sMonth)))
    .limit(1);
  if (!settRows[0]) {
    return NextResponse.json({ error: "Source month has no settlement yet — generate it first" }, { status: 400 });
  }
  const msRows = await db
    .select()
    .from(memberSettlements)
    .where(and(eq(memberSettlements.settlementId, settRows[0].id), eq(memberSettlements.memberId, data.memberId)))
    .limit(1);
  const due = msRows[0] ? Math.max(0, -msRows[0].closingBalancePaisa) : 0;
  if (due <= 0) {
    return NextResponse.json({ error: "No due left for this month" }, { status: 400 });
  }
  const closeRows = await db
    .select()
    .from(closingPeriods)
    .where(and(eq(closingPeriods.messId, id), eq(closingPeriods.year, sYear), eq(closingPeriods.month, sMonth)))
    .limit(1);
  if (settRows[0].status === "final" || closeRows[0]?.status === "closed") {
    return NextResponse.json(
      { error: "Source month is closed (final). Reopen settlement first.", code: "MONTH_CLOSED", period: data.sourceYm },
      { status: 409 },
    );
  }

  const amountPaisa = Math.round(data.amount * 100);
  const { toSourcePaisa, toCurrentPaisa } = splitDuePayment(amountPaisa, due);
  const now = new Date().toISOString();
  const method = data.paymentMethod || "cash";
  const userNote = data.note?.trim() || null;
  const made: { id: string; date: string; amountPaisa: number; kind: string }[] = [];

  async function addDeposit(date: string, paisa: number, note: string | null, kind: string) {
    const depId = nanoid();
    await db.insert(deposits).values({
      id: depId,
      messId: id,
      memberId: data.memberId,
      date,
      amountPaisa: paisa,
      paymentMethod: method,
      receivedBy: user!.id,
      transactionId: null,
      note,
      receiptUrl: null,
      clientRefId: `collect-${depId}`,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    const prevBal = await getMemberBalancePaisa(id, data.memberId);
    await db.insert(ledgerEntries).values({
      id: nanoid(),
      messId: id,
      memberId: data.memberId,
      date,
      type: "deposit",
      description: `Due collection ${data.sourceYm} ৳${(paisa / 100).toFixed(2)} (${method})`,
      debitPaisa: 0,
      creditPaisa: paisa,
      balancePaisa: prevBal + paisa,
      refType: "deposit",
      refId: depId,
      createdAt: now,
    });
    await db.insert(auditLogs).values({
      id: nanoid(),
      messId: id,
      actorId: user!.id,
      action: "create",
      entityType: "deposit",
      entityId: depId,
      afterJson: JSON.stringify({ amountPaisa: paisa, collectSourceYm: data.sourceYm, kind }),
      createdAt: now,
    });
    made.push({ id: depId, date, amountPaisa: paisa, kind });
    return depId;
  }

  if (toSourcePaisa > 0) {
    await addDeposit(sourceEnd, toSourcePaisa, `বকেয়া আদায় (${data.sourceYm})${userNote ? ` • ${userNote}` : ""}`, "source");
  }
  if (toCurrentPaisa > 0) {
    await addDeposit(receiptDate, toCurrentPaisa, userNote, "current");
  }

  try {
    if (mem[0].userId) {
      await createNotification({
        userId: mem[0].userId,
        messId: id,
        type: "deposit",
        title: `Due ৳${(toSourcePaisa / 100).toFixed(2)} of ${data.sourceYm} collected${toCurrentPaisa > 0 ? ` + ৳${(toCurrentPaisa / 100).toFixed(2)} this month` : ""}`,
        body: `${receiptDate} — ${method}`,
        link: `/messes/${id}/finance/deposits`,
      });
    }
  } catch {}

  return NextResponse.json({ ok: true, split: { toSourcePaisa, toCurrentPaisa, sourceDate: sourceEnd, currentDate: receiptDate }, deposits: made });
}
