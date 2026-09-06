import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { marketProducts, marketCategories, messMembers, auditLogs, marketEntryItems } from "@/db/schema";
import { slugify } from "@/lib/mess";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; productId: string }> }) {
  const { id, productId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0] || !["manager", "assistant_manager"].includes(access[0].role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await db.select().from(marketProducts).where(and(eq(marketProducts.id, productId), eq(marketProducts.messId, id))).limit(1);
  if (!existing[0]) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  if (existing[0].messId === null) return NextResponse.json({ error: "Cannot edit global product" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const updates: Record<string, unknown> = {};
  if (body?.name !== undefined) {
    const name = String(body.name).trim();
    if (name.length < 1 || name.length > 40) return NextResponse.json({ error: "Name 1-40" }, { status: 400 });
    updates.name = name;
    updates.slug = slugify(name);
  }
  if (body?.categoryId !== undefined) {
    const catId = String(body.categoryId);
    const cat = await db.select().from(marketCategories).where(eq(marketCategories.id, catId)).limit(1);
    if (!cat[0]) return NextResponse.json({ error: "Category not found" }, { status: 404 });
    updates.categoryId = catId;
  }
  if (body?.defaultUnit !== undefined) {
    const allowed = ["kg", "gram", "litre", "ml", "piece", "dozen", "packet", "bottle", "box", "custom"];
    if (!allowed.includes(String(body.defaultUnit))) return NextResponse.json({ error: "Invalid unit" }, { status: 400 });
    updates.defaultUnit = String(body.defaultUnit);
  }
  if (body?.sortOrder !== undefined) {
    const so = Number(body.sortOrder);
    if (!Number.isInteger(so) || so < 0 || so > 100) return NextResponse.json({ error: "sortOrder 0-100" }, { status: 400 });
    updates.sortOrder = so;
  }
  if (body?.isArchived !== undefined) updates.isArchived = !!body.isArchived;

  if (Object.keys(updates).length === 0) return NextResponse.json({ error: "No changes" }, { status: 400 });

  const before = existing[0];
  await db.update(marketProducts).set(updates as never).where(eq(marketProducts.id, productId));
  await db.insert(auditLogs).values({ id: nanoid(), messId: id, actorId: user.id, action: "update", entityType: "market_product", entityId: productId, beforeJson: JSON.stringify(before), afterJson: JSON.stringify(updates), createdAt: new Date().toISOString() });
  const row = await db.select().from(marketProducts).where(eq(marketProducts.id, productId)).limit(1);
  return NextResponse.json({ ok: true, product: row[0] });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; productId: string }> }) {
  const { id, productId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0] || access[0].role !== "manager") return NextResponse.json({ error: "Only manager can delete" }, { status: 403 });

  const existing = await db.select().from(marketProducts).where(and(eq(marketProducts.id, productId), eq(marketProducts.messId, id))).limit(1);
  if (!existing[0]) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  if (existing[0].messId === null) return NextResponse.json({ error: "Cannot delete global product" }, { status: 403 });

  const used = await db.select().from(marketEntryItems).where(eq(marketEntryItems.productId, productId)).limit(1);
  if (used[0]) {
    // soft archive instead
    await db.update(marketProducts).set({ isArchived: true } as never).where(eq(marketProducts.id, productId));
    await db.insert(auditLogs).values({ id: nanoid(), messId: id, actorId: user.id, action: "archive", entityType: "market_product", entityId: productId, beforeJson: JSON.stringify(existing[0]), createdAt: new Date().toISOString() });
    return NextResponse.json({ ok: true, archived: true, message: "Product is used in entries — archived instead" });
  }

  await db.delete(marketProducts).where(eq(marketProducts.id, productId));
  await db.insert(auditLogs).values({ id: nanoid(), messId: id, actorId: user.id, action: "delete", entityType: "market_product", entityId: productId, beforeJson: JSON.stringify(existing[0]), createdAt: new Date().toISOString() });
  return NextResponse.json({ ok: true });
}
