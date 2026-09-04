import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getDb } from "@/db";
import { invitations, messMembers } from "@/db/schema";
import { and, eq, or } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function POST(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const invRows = await db
    .select()
    .from(invitations)
    .where(or(eq(invitations.code, code), eq(invitations.linkToken, code)))
    .limit(1);
  const inv = invRows[0];
  if (!inv) return NextResponse.json({ error: "Invalid invitation" }, { status: 404 });
  if (inv.status !== "active") return NextResponse.json({ error: `Invitation ${inv.status}` }, { status: 400 });
  if (inv.expiresAt && new Date(inv.expiresAt) < new Date()) return NextResponse.json({ error: "Invitation expired" }, { status: 400 });

  // check not already member
  const existing = await db
    .select()
    .from(messMembers)
    .where(and(eq(messMembers.messId, inv.messId), eq(messMembers.userId, user.id)))
    .limit(1);
  if (existing[0]) return NextResponse.json({ error: "Already a member" }, { status: 409 });

  const now = new Date().toISOString();
  await db.insert(messMembers).values({
    id: nanoid(),
    messId: inv.messId,
    userId: user.id,
    role: inv.role || "member",
    isPrimaryManager: false,
    status: "active",
    invitedBy: inv.createdBy,
    joinedAt: now,
    createdAt: now,
    updatedAt: now,
  });
  await db.update(invitations).set({ status: "used", usedAt: now, usedBy: user.id }).where(eq(invitations.id, inv.id));
  return NextResponse.json({ ok: true, messId: inv.messId });
}
