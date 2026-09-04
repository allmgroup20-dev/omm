import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getDb } from "@/db";
import { expenseCategories, messMembers, auditLogs } from "@/db/schema";
import { expenseCategorySchema } from "@/lib/validators-expense";
import { slugify } from "@/lib/mess";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0]) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await db.select().from(expenseCategories).where(eq(expenseCategories.messId, id));
  return NextResponse.json({ categories: rows });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0] || !["manager", "assistant_manager"].includes(access[0].role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = expenseCategorySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });

  const { name, parentId } = parsed.data;
  const slug = slugify(name);
  const existing = await db.select().from(expenseCategories).where(and(eq(expenseCategories.messId, id))).then((rows) => rows.find((r) => r.slug === slug));
  if (existing) return NextResponse.json({ error: "Category exists" }, { status: 409 });

  const now = new Date().toISOString();
  const catId = nanoid();
  await db.insert(expenseCategories).values({
    id: catId,
    messId: id,
    name: name.trim(),
    slug,
    parentId: parentId || null,
    isActive: true,
    createdAt: now,
  });
  await db.insert(auditLogs).values({ id: nanoid(), messId: id, actorId: user.id, action: "create", entityType: "expense_category", entityId: catId, afterJson: JSON.stringify({ name }), createdAt: now });
  const row = await db.select().from(expenseCategories).where(eq(expenseCategories.id, catId)).limit(1);
  return NextResponse.json({ ok: true, category: row[0] });
}
