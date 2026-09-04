import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getDb } from "@/db";
import { mealLocks, messMembers, auditLogs } from "@/db/schema";
import { lockSchema } from "@/lib/validators-meal";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0]) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await db.select().from(mealLocks).where(eq(mealLocks.messId, id));
  return NextResponse.json({ locks: rows });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0] || !["manager", "assistant_manager"].includes(access[0].role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = lockSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });

  const { date, reason } = parsed.data;
  const existing = await db.select().from(mealLocks).where(and(eq(mealLocks.messId, id), eq(mealLocks.date, date))).limit(1);
  if (existing[0]) return NextResponse.json({ error: "Already locked" }, { status: 409 });

  const now = new Date().toISOString();
  const lockId = nanoid();
  await db.insert(mealLocks).values({ id: lockId, messId: id, date, lockedBy: user.id, lockedAt: now, reason: reason || null });
  await db.insert(auditLogs).values({ id: nanoid(), messId: id, actorId: user.id, action: "create", entityType: "meal_lock", entityId: lockId, afterJson: JSON.stringify({ date }), createdAt: now });
  return NextResponse.json({ ok: true, lock: { id: lockId, date } });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0] || access[0].role !== "manager") return NextResponse.json({ error: "Only manager can unlock" }, { status: 403 });

  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });
  await db.delete(mealLocks).where(and(eq(mealLocks.messId, id), eq(mealLocks.date, date)));
  return NextResponse.json({ ok: true });
}
