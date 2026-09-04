import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getDb } from "@/db";
import { expenses, expenseCategories, messMembers, messes, auditLogs } from "@/db/schema";
import { expenseSchema } from "@/lib/validators-expense";
import { and, eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0]) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const limit = Math.min(Number(url.searchParams.get("limit") || 100), 200);
  const offset = Number(url.searchParams.get("offset") || 0);
  const date = url.searchParams.get("date");

  let rows = await db.select().from(expenses).where(eq(expenses.messId, id)).orderBy(desc(expenses.createdAt)).limit(limit).offset(offset);
  if (date) rows = rows.filter((r) => r.date === date);
  if (status) rows = rows.filter((r) => r.status === status);
  return NextResponse.json({ expenses: rows, total: rows.length });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0] || !["manager", "assistant_manager", "member"].includes(access[0].role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = expenseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;
  const amountPaisa = Math.round(data.amount * 100);
  if (amountPaisa <= 0) return NextResponse.json({ error: "Amount must be >0" }, { status: 400 });

  // validate category
  if (data.categoryId) {
    const cat = await db.select().from(expenseCategories).where(eq(expenseCategories.id, data.categoryId)).limit(1);
    if (!cat[0] || (cat[0].messId !== null && cat[0].messId !== id)) return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }
  if (data.paidBy) {
    const mem = await db.select().from(messMembers).where(and(eq(messMembers.id, data.paidBy), eq(messMembers.messId, id))).limit(1);
    if (!mem[0]) return NextResponse.json({ error: "PaidBy not in mess" }, { status: 400 });
  }
  if (data.clientRefId) {
    const existing = await db.select().from(expenses).where(eq(expenses.clientRefId, data.clientRefId)).limit(1);
    if (existing[0]) return NextResponse.json({ error: "Duplicate (clientRefId)" }, { status: 409 });
  }

  // threshold check
  const messRows = await db.select().from(messes).where(eq(messes.id, id)).limit(1);
  const threshold = messRows[0]?.expenseApprovalThresholdPaisa ?? 500000;
  const needsApproval = amountPaisa > threshold;
  const status = needsApproval ? "pending" : "approved";

  const now = new Date().toISOString();
  const expId = nanoid();
  await db.insert(expenses).values({
    id: expId,
    messId: id,
    date: data.date,
    categoryId: data.categoryId || null,
    amountPaisa,
    paidBy: data.paidBy || null,
    paymentMethod: data.paymentMethod || "cash",
    description: data.description?.trim() || null,
    receiptUrl: data.receiptUrl?.trim() || null,
    notes: data.notes?.trim() || null,
    status,
    clientRefId: data.clientRefId || null,
    createdBy: user.id,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(auditLogs).values({ id: nanoid(), messId: id, actorId: user.id, action: "create", entityType: "expense", entityId: expId, afterJson: JSON.stringify({ amountPaisa, status }), createdAt: now });

  const row = await db.select().from(expenses).where(eq(expenses.id, expId)).limit(1);
  return NextResponse.json({ ok: true, expense: row[0], needsApproval });
}
