import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { marketProducts, marketCategories, messMembers, auditLogs } from "@/db/schema";
import { productSchema } from "@/lib/validators-market";
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
  const rows = await db.select().from(marketProducts).where(eq(marketProducts.messId, id));
  return NextResponse.json({ products: rows });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0] || !["manager", "assistant_manager"].includes(access[0].role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });

  const { name, categoryId, defaultUnit } = parsed.data;
  const cat = await db.select().from(marketCategories).where(eq(marketCategories.id, categoryId)).limit(1);
  if (!cat[0]) return NextResponse.json({ error: "Category not found" }, { status: 404 });

  const slug = slugify(name);
  const now = new Date().toISOString();
  const prodId = nanoid();
  await db.insert(marketProducts).values({
    id: prodId,
    messId: id,
    categoryId,
    name: name.trim(),
    slug,
    defaultUnit: defaultUnit || "kg",
    isArchived: false,
    createdAt: now,
  });
  await db.insert(auditLogs).values({ id: nanoid(), messId: id, actorId: user.id, action: "create", entityType: "market_product", entityId: prodId, afterJson: JSON.stringify({ name }), createdAt: now });
  const row = await db.select().from(marketProducts).where(eq(marketProducts.id, prodId)).limit(1);
  return NextResponse.json({ ok: true, product: row[0] });
}
