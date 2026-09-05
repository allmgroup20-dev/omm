import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { messMembers, users, auditLogs } from "@/db/schema";
import { linkMemberSchema } from "@/lib/validators-mess";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

// POST — link a placeholder member to a registered user account. Manager only.
// History (meals/deposits/ledger) stays under the same memberId.
export async function POST(req: Request, { params }: { params: Promise<{ id: string; memberId: string }> }) {
  const { id, memberId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0] || access[0].role !== "manager") {
    return NextResponse.json({ error: "Forbidden — only manager can link accounts" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = linkMemberSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });

  const target = await db.select().from(messMembers).where(and(eq(messMembers.id, memberId), eq(messMembers.messId, id))).limit(1);
  if (!target[0]) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  if (target[0].userId) return NextResponse.json({ error: "Already linked to an account" }, { status: 409 });

  const targetUser = await db.select().from(users).where(eq(users.id, parsed.data.userId)).limit(1);
  if (!targetUser[0]) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (targetUser[0].status !== "active") return NextResponse.json({ error: "User account is not active" }, { status: 400 });

  // Target must not already be a member of this mess (any row)
  const dupe = await db
    .select()
    .from(messMembers)
    .where(and(eq(messMembers.messId, id), eq(messMembers.userId, targetUser[0].id)))
    .limit(1);
  if (dupe[0]) return NextResponse.json({ error: "This account is already a member of this mess" }, { status: 409 });

  const now = new Date().toISOString();
  const before = target[0];
  await db
    .update(messMembers)
    .set({ userId: targetUser[0].id, claimedAt: now, claimedBy: user.id, updatedAt: now })
    .where(eq(messMembers.id, memberId));
  await db.insert(auditLogs).values({
    id: nanoid(),
    messId: id,
    actorId: user.id,
    action: "link",
    entityType: "mess_member",
    entityId: memberId,
    beforeJson: JSON.stringify({ userId: null, displayName: before.displayName }),
    afterJson: JSON.stringify({ userId: targetUser[0].id, email: targetUser[0].email }),
    reason: "Manager linked placeholder to registered account",
    createdAt: now,
  });

  const after = await db.select().from(messMembers).where(eq(messMembers.id, memberId)).limit(1);
  return NextResponse.json({ ok: true, member: after[0] });
}
