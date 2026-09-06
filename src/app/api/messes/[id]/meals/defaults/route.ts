import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { mealDefaults, mealTypes, messMembers } from "@/db/schema";
import { mealDefaultsBulkSchema, toScaled, validatePrecision } from "@/lib/validators-meal";
import { getMessPrecision } from "@/lib/meal-helpers";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0]) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await db.select().from(mealDefaults).where(eq(mealDefaults.messId, id));
  return NextResponse.json({ defaults: rows });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0] || !["manager", "assistant_manager"].includes(access[0].role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = mealDefaultsBulkSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });

  const precision = await getMessPrecision(id);
  const now = new Date().toISOString();
  const upserted: string[] = [];

  for (const d of parsed.data.defaults) {
    const type = await db.select().from(mealTypes).where(and(eq(mealTypes.id, d.mealTypeId), eq(mealTypes.messId, id))).limit(1);
    if (!type[0]) return NextResponse.json({ error: `Meal type not found: ${d.mealTypeId}` }, { status: 404 });
    const scaled = toScaled(d.defaultQty);
    if (!validatePrecision(scaled, precision)) return NextResponse.json({ error: `Qty ${d.defaultQty} invalid precision` }, { status: 400 });

    const existing = await db.select().from(mealDefaults).where(and(eq(mealDefaults.messId, id), eq(mealDefaults.mealTypeId, d.mealTypeId))).limit(1);
    if (existing[0]) {
      await db.update(mealDefaults).set({ defaultScaled: scaled, isEnabled: d.isEnabled ?? true, updatedAt: now }).where(eq(mealDefaults.id, existing[0].id));
      upserted.push(existing[0].id);
    } else {
      const nid = nanoid();
      await db.insert(mealDefaults).values({
        id: nid,
        messId: id,
        mealTypeId: d.mealTypeId,
        memberId: null,
        defaultScaled: scaled,
        isEnabled: d.isEnabled ?? true,
        createdAt: now,
        updatedAt: now,
      });
      upserted.push(nid);
    }
  }

  const rows = await db.select().from(mealDefaults).where(eq(mealDefaults.messId, id));
  return NextResponse.json({ ok: true, defaults: rows, upserted });
}
