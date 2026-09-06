import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { mealRecords, mealDefaults, mealTypes, messMembers } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { isDateLocked, isMonthClosed } from "@/lib/meal-helpers";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0] || !["manager", "assistant_manager"].includes(access[0].role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const date: string | undefined = body?.date;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "date YYYY-MM-DD required" }, { status: 400 });

  if (await isDateLocked(id, date)) return NextResponse.json({ error: "Date is locked" }, { status: 423 });
  if (await isMonthClosed(id, date)) return NextResponse.json({ error: "Month is closed" }, { status: 423 });

  const defaults = await db.select().from(mealDefaults).where(and(eq(mealDefaults.messId, id), eq(mealDefaults.isEnabled, true)));
  if (!defaults.length) return NextResponse.json({ error: "No auto-fill template saved. Save defaults first." }, { status: 400 });

  // active members
  const members = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.status, "active")));
  if (!members.length) return NextResponse.json({ error: "No active members" }, { status: 400 });

  // map mealTypeId -> defaultScaled
  const defMap = new Map<string, number>();
  for (const d of defaults) defMap.set(d.mealTypeId, d.defaultScaled);

  // verify mealTypes still active
  const types = await db.select().from(mealTypes).where(and(eq(mealTypes.messId, id), eq(mealTypes.isActive, true)));
  const activeTypeIds = new Set(types.map((t) => t.id));

  let inserted = 0;
  let skipped = 0;
  const now = new Date().toISOString();

  for (const m of members) {
    for (const [typeId, scaled] of defMap) {
      if (!activeTypeIds.has(typeId)) continue;
      if (scaled === 0) continue; // 0 means skip that type
      const existing = await db.select().from(mealRecords).where(and(eq(mealRecords.messId, id), eq(mealRecords.memberId, m.id), eq(mealRecords.date, date), eq(mealRecords.mealTypeId, typeId))).limit(1);
      if (existing[0]) {
        skipped++;
        continue;
      }
      await db.insert(mealRecords).values({
        id: nanoid(),
        messId: id,
        memberId: m.id,
        date,
        mealTypeId: typeId,
        quantityScaled: scaled,
        createdBy: user.id,
        updatedBy: user.id,
        createdAt: now,
        updatedAt: now,
      });
      inserted++;
    }
  }

  return NextResponse.json({ ok: true, date, inserted, skipped });
}
