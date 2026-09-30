import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { monthlySettlements, memberSettlements, messMembers, settlementAdjustments, auditLogs } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

type Ctx = { params: Promise<{ id: string; settlementId: string; memberId: string }> };

async function loadSettlement(db: Awaited<ReturnType<typeof getRequestDb>>, id: string, settlementId: string, memberId: string) {
  const sett = await db
    .select()
    .from(monthlySettlements)
    .where(and(eq(monthlySettlements.id, settlementId), eq(monthlySettlements.messId, id)))
    .limit(1);
  if (!sett[0]) return { error: "Settlement not found", status: 404 } as const;
  const memSett = await db
    .select()
    .from(memberSettlements)
    .where(and(eq(memberSettlements.settlementId, settlementId), eq(memberSettlements.memberId, memberId)))
    .limit(1);
  if (!memSett[0]) return { error: "Member not in this settlement", status: 404 } as const;
  return { sett: sett[0], memSett: memSett[0] };
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
 * Record an advance disposition: carry (member-approved, net effect 0 —
 * auto-carry continues) or refund (cash handed back, −closing so next
 * month's opening becomes 0). Only positive closings (advances) qualify.
 * Immutable rows; latest per member wins. Works on draft AND final
 * settlements — a refund never changes the closed month's own numbers,
 * only the next month's opening balance.
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

  const loaded = await loadSettlement(db, id, settlementId, memberId);
  if ("error" in loaded) return NextResponse.json({ error: loaded.error }, { status: loaded.status });

  const closing = loaded.memSett.closingBalancePaisa;
  if (closing <= 0) {
    return NextResponse.json({ error: "Only positive advances can be carried or refunded" }, { status: 400 });
  }

  const amountPaisa = kind === "refund" ? -closing : 0;
  const now = new Date().toISOString();
  const adjId = nanoid();
  await db.insert(settlementAdjustments).values({
    id: adjId,
    settlementId,
    memberId,
    amountPaisa,
    kind,
    reason: note || (kind === "refund" ? `Cash refund of advance ৳${(closing / 100).toFixed(2)}` : `Member-approved carry of advance ৳${(closing / 100).toFixed(2)} to next month`),
    createdBy: user.id,
    createdAt: now,
  });
  await db.insert(auditLogs).values({
    id: nanoid(),
    messId: id,
    actorId: user.id,
    action: "disposition",
    entityType: "member_settlement",
    entityId: loaded.memSett.id,
    beforeJson: JSON.stringify({ closingBalancePaisa: closing }),
    afterJson: JSON.stringify({ kind, amountPaisa }),
    reason: note || null,
    createdAt: now,
  });
  return NextResponse.json({ ok: true, kind, amountPaisa, closingBalancePaisa: closing });
}
