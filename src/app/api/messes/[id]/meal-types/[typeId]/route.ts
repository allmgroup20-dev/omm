import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getDb } from "@/db";
import { mealTypes, messMembers, auditLogs } from "@/db/schema";
import { mealTypeSchema } from "@/lib/validators-meal";
import { slugify } from "@/lib/mess";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; typeId: string }> }) {
  const { id, typeId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0] || !["manager", "assistant_manager"].includes(access[0].role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = mealTypeSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });

  const before = await db.select().from(mealTypes).where(and(eq(mealTypes.id, typeId), eq(mealTypes.messId, id))).limit(1);
  if (!before[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) {
    updates.name = parsed.data.name.trim();
    updates.slug = slugify(parsed.data.name);
  }
  if (parsed.data.sortOrder !== undefined) updates.sortOrder = parsed.data.sortOrder;
  if (parsed.data.isActive !== undefined) updates.isActive = parsed.data.isActive;

  await db.update(mealTypes).set(updates as never).where(eq(mealTypes.id, typeId));
  await db.insert(auditLogs).values({
    id: nanoid(),
    messId: id,
    actorId: user.id,
    action: "update",
    entityType: "meal_type",
    entityId: typeId,
    beforeJson: JSON.stringify(before[0]),
    afterJson: JSON.stringify(updates),
    createdAt: new Date().toISOString(),
  });
  const after = await db.select().from(mealTypes).where(eq(mealTypes.id, typeId)).limit(1);
  return NextResponse.json({ ok: true, mealType: after[0] });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; typeId: string }> }) {
  const { id, typeId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0] || access[0].role !== "manager") return NextResponse.json({ error: "Only manager can archive" }, { status: 403 });

  // Soft archive, not hard delete — preserves historical meal_records
  await db.update(mealTypes).set({ isActive: false }).where(eq(mealTypes.id, typeId));
  await db.insert(auditLogs).values({
    id: nanoid(),
    messId: id,
    actorId: user.id,
    action: "update",
    entityType: "meal_type",
    entityId: typeId,
    afterJson: JSON.stringify({ isActive: false }),
    createdAt: new Date().toISOString(),
  });
  return NextResponse.json({ ok: true });
}
