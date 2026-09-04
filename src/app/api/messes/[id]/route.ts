import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getDb } from "@/db";
import { messes, messMembers, auditLogs } from "@/db/schema";
import { updateMessSchema } from "@/lib/validators-mess";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0]) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await db.select().from(messes).where(eq(messes.id, id)).limit(1);
  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ mess: rows[0], role: access[0].role });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0] || !["manager", "assistant_manager"].includes(access[0].role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  // only manager can change allocation/threshold
  if (access[0].role !== "manager" && !["name", "description", "address"].every(() => true)) {
    // simplified: assistant can update basic fields only — enforce via check
  }

  const body = await req.json().catch(() => null);
  const parsed = updateMessSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { updatedAt: now };
  if (data.name !== undefined) updates.name = data.name.trim();
  if (data.description !== undefined) updates.description = data.description?.trim() || null;
  if (data.address !== undefined) updates.address = data.address || null;
  if (data.contactInfo !== undefined) updates.contactInfo = data.contactInfo || null;
  if (data.timezone !== undefined) updates.timezone = data.timezone;
  if (data.costAllocation !== undefined) {
    if (access[0].role !== "manager") return NextResponse.json({ error: "Only manager can change allocation" }, { status: 403 });
    updates.costAllocation = data.costAllocation;
  }
  if (data.mealCostingModel !== undefined) {
    if (access[0].role !== "manager") return NextResponse.json({ error: "Only manager can change costing model" }, { status: 403 });
    updates.mealCostingModel = data.mealCostingModel;
  }
  if (data.expenseApprovalThreshold !== undefined) {
    if (access[0].role !== "manager") return NextResponse.json({ error: "Only manager" }, { status: 403 });
    updates.expenseApprovalThresholdPaisa = Math.round(data.expenseApprovalThreshold * 100);
  }

  const before = await db.select().from(messes).where(eq(messes.id, id)).limit(1);
  await db.update(messes).set(updates as never).where(eq(messes.id, id));
  await db.insert(auditLogs).values({
    id: nanoid(),
    messId: id,
    actorId: user.id,
    action: "update",
    entityType: "mess",
    entityId: id,
    beforeJson: JSON.stringify(before[0]),
    afterJson: JSON.stringify(updates),
    createdAt: now,
  });
  const after = await db.select().from(messes).where(eq(messes.id, id)).limit(1);
  return NextResponse.json({ ok: true, mess: after[0] });
}
