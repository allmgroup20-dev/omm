import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { mealTypes, messMembers, auditLogs } from "@/db/schema";
import { mealTypeSchema } from "@/lib/validators-meal";
import { slugify } from "@/lib/mess";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0]) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await db.select().from(mealTypes).where(eq(mealTypes.messId, id));
  return NextResponse.json({ mealTypes: rows.sort((a, b) => a.sortOrder - b.sortOrder) });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0] || !["manager", "assistant_manager"].includes(access[0].role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = mealTypeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });

  const { name, sortOrder, isActive } = parsed.data;
  const slug = slugify(name);
  const existing = await db.select().from(mealTypes).where(and(eq(mealTypes.messId, id), eq(mealTypes.slug, slug))).limit(1);
  if (existing[0]) return NextResponse.json({ error: "Meal type already exists" }, { status: 409 });

  const now = new Date().toISOString();
  const mtId = nanoid();
  await db.insert(mealTypes).values({
    id: mtId,
    messId: id,
    name: name.trim(),
    slug,
    sortOrder: sortOrder ?? 0,
    isActive: isActive ?? true,
    createdAt: now,
  });
  await db.insert(auditLogs).values({
    id: nanoid(),
    messId: id,
    actorId: user.id,
    action: "create",
    entityType: "meal_type",
    entityId: mtId,
    afterJson: JSON.stringify({ name, slug }),
    createdAt: now,
  });
  const row = await db.select().from(mealTypes).where(eq(mealTypes.id, mtId)).limit(1);
  return NextResponse.json({ ok: true, mealType: row[0] });
}
