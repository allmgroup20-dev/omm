import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { messMembers, users, auditLogs } from "@/db/schema";
import { createPlaceholderSchema } from "@/lib/validators-mess";
import { memberDisplayName, normalizeMemberName } from "@/lib/mess";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0]) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await db
    .select({ member: messMembers, user: users })
    .from(messMembers)
    .leftJoin(users, eq(messMembers.userId, users.id))
    .where(eq(messMembers.messId, id));

  return NextResponse.json({
    members: rows.map((r) => ({
      id: r.member.id,
      userId: r.user?.id || null,
      displayName: memberDisplayName(r.member, r.user ? { fullName: r.user.fullName } : null),
      fullName: memberDisplayName(r.member, r.user ? { fullName: r.user.fullName } : null),
      email: r.user?.email || null,
      phone: r.user?.phone || null,
      profilePhoto: r.user?.profilePhoto || null,
      role: r.member.role,
      isPrimaryManager: r.member.isPrimaryManager,
      status: r.member.status,
      isPlaceholder: !r.member.userId,
      claimedAt: r.member.claimedAt,
      joinedAt: r.member.joinedAt,
      leftAt: r.member.leftAt,
    })),
  });
}

// POST — quick-add placeholder member (name only, no account). Manager/assistant only.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0] || !["manager", "assistant_manager"].includes(access[0].role)) {
    return NextResponse.json({ error: "Forbidden — only manager can add members" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createPlaceholderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });

  const displayName = parsed.data.displayName.trim();
  const norm = normalizeMemberName(displayName);

  // Unique (case-insensitive) among placeholder AND linked names in this mess
  const existing = await db.select().from(messMembers).where(eq(messMembers.messId, id));
  if (existing.some((m) => normalizeMemberName(m.displayName || "") === norm)) {
    return NextResponse.json({ error: "এই নামে সদস্য ইতিমধ্যে আছে" }, { status: 409 });
  }
  const linkedIds = existing.filter((m) => m.userId).map((m) => m.userId as string);
  if (linkedIds.length) {
    const { inArray } = await import("drizzle-orm");
    const linkedUsers = await db.select().from(users).where(inArray(users.id, linkedIds));
    if (linkedUsers.some((u) => normalizeMemberName(u.fullName) === norm)) {
      return NextResponse.json({ error: "এই নামে সদস্য ইতিমধ্যে আছে" }, { status: 409 });
    }
  }

  const now = new Date().toISOString();
  const memberId = nanoid();
  await db.insert(messMembers).values({
    id: memberId,
    messId: id,
    userId: null,
    displayName,
    role: parsed.data.role || "member",
    isPrimaryManager: false,
    status: "active",
    invitedBy: user.id,
    joinedAt: now,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(auditLogs).values({
    id: nanoid(),
    messId: id,
    actorId: user.id,
    action: "create",
    entityType: "mess_member",
    entityId: memberId,
    afterJson: JSON.stringify({ displayName, placeholder: true }),
    createdAt: now,
  });
  const row = await db.select().from(messMembers).where(eq(messMembers.id, memberId)).limit(1);
  return NextResponse.json({ ok: true, member: { ...row[0], isPlaceholder: true } });
}
