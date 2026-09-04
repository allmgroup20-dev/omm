import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getDb } from "@/db";
import { marketCategories, messMembers, auditLogs } from "@/db/schema";
import { categorySchema } from "@/lib/validators-market";
import { slugify } from "@/lib/mess";
import { and, eq, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0]) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await db.select().from(marketCategories).where(eq(marketCategories.messId, id));
  // also include global templates where messId is null
  const globals = await db.select().from(marketCategories).where(isNull(marketCategories.messId));
  return NextResponse.json({ categories: [...globals, ...rows] });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0] || !["manager", "assistant_manager"].includes(access[0].role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });

  const { name, parentId, sortOrder } = parsed.data;
  let level = 0;
  if (parentId) {
    const parent = await db.select().from(marketCategories).where(eq(marketCategories.id, parentId)).limit(1);
    if (!parent[0]) return NextResponse.json({ error: "Parent not found" }, { status: 404 });
    level = parent[0].level + 1;
    if (level > 5) return NextResponse.json({ error: "Max nesting 5" }, { status: 400 });
  }

  const slug = slugify(name);
  const existing = await db.select().from(marketCategories).where(and(eq(marketCategories.messId, id), eq(marketCategories.slug, slug))).limit(1);
  if (existing[0]) return NextResponse.json({ error: "Category exists" }, { status: 409 });

  const now = new Date().toISOString();
  const catId = nanoid();
  await db.insert(marketCategories).values({
    id: catId,
    messId: id,
    parentId: parentId || null,
    name: name.trim(),
    slug,
    level,
    sortOrder: sortOrder ?? 0,
    isActive: true,
    createdAt: now,
  });
  await db.insert(auditLogs).values({ id: nanoid(), messId: id, actorId: user.id, action: "create", entityType: "market_category", entityId: catId, afterJson: JSON.stringify({ name, slug }), createdAt: now });
  const row = await db.select().from(marketCategories).where(eq(marketCategories.id, catId)).limit(1);
  return NextResponse.json({ ok: true, category: row[0] });
}
