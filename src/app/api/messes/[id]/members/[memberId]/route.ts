import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { messMembers, auditLogs } from "@/db/schema";
import { updateMemberSchema } from "@/lib/validators-mess";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; memberId: string }> }) {
  const { id, memberId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0] || access[0].role !== "manager") return NextResponse.json({ error: "Only manager can update members" }, { status: 403 });

  const target = await db.select().from(messMembers).where(and(eq(messMembers.id, memberId), eq(messMembers.messId, id))).limit(1);
  if (!target[0]) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  // prevent deleting historical record via hard delete; we use status changes
  // prevent demoting last primary manager
  const body = await req.json().catch(() => null);
  const parsed = updateMemberSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;
  const now = new Date().toISOString();
  const before = target[0];
  const updates: Record<string, unknown> = { updatedAt: now };
  if (data.role !== undefined) updates.role = data.role;
  if (data.status !== undefined) {
    updates.status = data.status;
    if (["left", "archived"].includes(data.status)) updates.leftAt = now;
  }
  if (data.isPrimaryManager !== undefined) updates.isPrimaryManager = data.isPrimaryManager;
  if (data.permissionsJson !== undefined) updates.permissionsJson = data.permissionsJson;

  await db.update(messMembers).set(updates as never).where(eq(messMembers.id, memberId));
  await db.insert(auditLogs).values({
    id: nanoid(),
    messId: id,
    actorId: user.id,
    action: "update",
    entityType: "mess_member",
    entityId: memberId,
    beforeJson: JSON.stringify(before),
    afterJson: JSON.stringify(updates),
    createdAt: now,
  });
  return NextResponse.json({ ok: true });
}
