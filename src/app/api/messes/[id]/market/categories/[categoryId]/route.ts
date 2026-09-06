import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { marketCategories, marketProducts, messMembers, auditLogs } from "@/db/schema";
import { categorySchema } from "@/lib/validators-market";
import { slugify } from "@/lib/mess";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; categoryId: string }> }) {
  const { id, categoryId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0] || !["manager", "assistant_manager"].includes(access[0].role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await db.select().from(marketCategories).where(and(eq(marketCategories.id, categoryId), eq(marketCategories.messId, id))).limit(1);
  if (!existing[0]) return NextResponse.json({ error: "Category not found" }, { status: 404 });
  // global categories (messId IS NULL) cannot be edited via per-mess route
  if (existing[0].messId === null) return NextResponse.json({ error: "Cannot edit global category" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = categorySchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) {
    const name = parsed.data.name.trim();
    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
    const slug = slugify(name);
    const dup = await db.select().from(marketCategories).where(and(eq(marketCategories.messId, id), eq(marketCategories.slug, slug))).limit(1);
    if (dup[0] && dup[0].id !== categoryId) return NextResponse.json({ error: "Category exists" }, { status: 409 });
    updates.name = name;
    updates.slug = slug;
  }
  if (parsed.data.sortOrder !== undefined) updates.sortOrder = parsed.data.sortOrder;
  if (parsed.data.parentId !== undefined) {
    const parentId = parsed.data.parentId || null;
    if (parentId === categoryId) return NextResponse.json({ error: "Cannot be parent of itself" }, { status: 400 });
    if (parentId) {
      const parent = await db.select().from(marketCategories).where(and(eq(marketCategories.id, parentId), eq(marketCategories.messId, id))).limit(1);
      if (!parent[0]) return NextResponse.json({ error: "Parent not found" }, { status: 404 });
      // cycle check: walk up parents
      let cur: string | null = parent[0].parentId;
      const visited = new Set<string>([categoryId]);
      while (cur) {
        if (visited.has(cur)) return NextResponse.json({ error: "Cycle detected" }, { status: 400 });
        visited.add(cur);
        const row = await db.select().from(marketCategories).where(eq(marketCategories.id, cur)).limit(1);
        cur = row[0]?.parentId || null;
        if (visited.size > 10) break;
      }
      if (parent[0].level + 1 > 5) return NextResponse.json({ error: "Max nesting 5" }, { status: 400 });
      updates.parentId = parentId;
      updates.level = parent[0].level + 1;
    } else {
      updates.parentId = null;
      updates.level = 0;
    }
  }

  if (Object.keys(updates).length === 0) return NextResponse.json({ error: "No changes" }, { status: 400 });

  const before = existing[0];
  await db.update(marketCategories).set(updates as never).where(eq(marketCategories.id, categoryId));
  await db.insert(auditLogs).values({ id: nanoid(), messId: id, actorId: user.id, action: "update", entityType: "market_category", entityId: categoryId, beforeJson: JSON.stringify(before), afterJson: JSON.stringify(updates), createdAt: new Date().toISOString() });
  const row = await db.select().from(marketCategories).where(eq(marketCategories.id, categoryId)).limit(1);
  return NextResponse.json({ ok: true, category: row[0] });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; categoryId: string }> }) {
  const { id, categoryId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0] || access[0].role !== "manager") return NextResponse.json({ error: "Only manager can delete" }, { status: 403 });

  const existing = await db.select().from(marketCategories).where(and(eq(marketCategories.id, categoryId), eq(marketCategories.messId, id))).limit(1);
  if (!existing[0]) return NextResponse.json({ error: "Category not found" }, { status: 404 });
  if (existing[0].messId === null) return NextResponse.json({ error: "Cannot delete global category" }, { status: 403 });

  const hasProducts = await db.select().from(marketProducts).where(eq(marketProducts.categoryId, categoryId)).limit(1);
  if (hasProducts[0]) return NextResponse.json({ error: "Category has products — move or archive them first" }, { status: 409 });
  const hasChildren = await db.select().from(marketCategories).where(eq(marketCategories.parentId, categoryId)).limit(1);
  if (hasChildren[0]) return NextResponse.json({ error: "Category has sub-categories — delete them first" }, { status: 409 });

  await db.delete(marketCategories).where(eq(marketCategories.id, categoryId));
  await db.insert(auditLogs).values({ id: nanoid(), messId: id, actorId: user.id, action: "delete", entityType: "market_category", entityId: categoryId, beforeJson: JSON.stringify(existing[0]), createdAt: new Date().toISOString() });
  return NextResponse.json({ ok: true });
}
