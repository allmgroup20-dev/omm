import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getDb } from "@/db";
import { messMembers, mealTypes, mealRecords } from "@/db/schema";
import { bulkSetAllSchema, toScaled, validatePrecision } from "@/lib/validators-meal";
import { getMessPrecision, isDateLocked, isMonthClosed } from "@/lib/meal-helpers";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

// POST bulk set-all: {date, quantity, mealTypeId?, memberIds?}
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0] || !["manager", "assistant_manager"].includes(access[0].role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = bulkSetAllSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });

  const { date, quantity, mealTypeId, memberIds } = parsed.data;

  if (await isDateLocked(id, date) && access[0].role !== "manager") return NextResponse.json({ error: "Date locked" }, { status: 423 });
  if (await isMonthClosed(id, date) && access[0].role !== "manager") return NextResponse.json({ error: "Month closed" }, { status: 423 });

  const precision = await getMessPrecision(id);
  const scaled = toScaled(quantity);
  if (!validatePrecision(scaled, precision)) return NextResponse.json({ error: `Invalid precision, must be multiple of ${precision === 50 ? 0.5 : 1}` }, { status: 400 });

  // Determine members: if memberIds given use them, else all active
  let targetMemberIds: string[] = [];
  if (memberIds?.length) {
    targetMemberIds = memberIds;
  } else {
    const all = await db.select({ id: messMembers.id }).from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.status, "active")));
    targetMemberIds = all.map((r) => r.id);
  }

  // Determine meal types
  let typeIds: string[] = [];
  if (mealTypeId) {
    typeIds = [mealTypeId];
  } else {
    const types = await db.select({ id: mealTypes.id }).from(mealTypes).where(and(eq(mealTypes.messId, id), eq(mealTypes.isActive, true)));
    typeIds = types.map((r) => r.id);
  }

  const now = new Date().toISOString();
  let count = 0;
  for (const mid of targetMemberIds) {
    for (const tid of typeIds) {
      const existing = await db
        .select()
        .from(mealRecords)
        .where(and(eq(mealRecords.messId, id), eq(mealRecords.memberId, mid), eq(mealRecords.date, date), eq(mealRecords.mealTypeId, tid)))
        .limit(1);
      if (existing[0]) {
        if (existing[0].quantityScaled !== scaled) {
          await db.update(mealRecords).set({ quantityScaled: scaled, updatedBy: user.id, updatedAt: now }).where(eq(mealRecords.id, existing[0].id));
          count++;
        }
      } else {
        await db.insert(mealRecords).values({
          id: nanoid(),
          messId: id,
          memberId: mid,
          date,
          mealTypeId: tid,
          quantityScaled: scaled,
          createdBy: user.id,
          updatedBy: user.id,
          createdAt: now,
          updatedAt: now,
        });
        count++;
      }
    }
  }
  return NextResponse.json({ ok: true, updated: count, date, quantity });
}
