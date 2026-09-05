import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { messMembers, auditLogs } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

// POST — unlink an account from a member (back to placeholder). Manager only.
// History stays under the same memberId; nothing is deleted.
export async function POST(req: Request, { params }: { params: Promise<{ id: string; memberId: string }> }) {
  const { id, memberId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0] || access[0].role !== "manager") {
    return NextResponse.json({ error: "Forbidden — only manager can unlink accounts" }, { status: 403 });
  }

  const target = await db.select().from(messMembers).where(and(eq(messMembers.id, memberId), eq(messMembers.messId, id))).limit(1);
  if (!target[0]) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  if (!target[0].userId) return NextResponse.json({ error: "Not linked to any account" }, { status: 400 });
  if (!target[0].claimedAt) {
    // Originally-joined (non-placeholder) members cannot be unlinked — only claim-linked ones
    return NextResponse.json({ error: "Only placeholder-linked accounts can be unlinked" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const reason = (body?.reason as string)?.trim() || "Wrong account linked";

  const now = new Date().toISOString();
  const before = target[0];
  await db
    .update(messMembers)
    .set({ userId: null, claimedAt: null, claimedBy: null, updatedAt: now })
    .where(eq(messMembers.id, memberId));
  await db.insert(auditLogs).values({
    id: nanoid(),
    messId: id,
    actorId: user.id,
    action: "unlink",
    entityType: "mess_member",
    entityId: memberId,
    beforeJson: JSON.stringify({ userId: before.userId }),
    afterJson: JSON.stringify({ userId: null }),
    reason,
    createdAt: now,
  });
  return NextResponse.json({ ok: true });
}
