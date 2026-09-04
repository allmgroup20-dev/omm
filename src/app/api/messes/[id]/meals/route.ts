import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getDb } from "@/db";
import { mealRecords, messMembers, mealTypes, auditLogs, mealCorrections } from "@/db/schema";
import { mealEntrySchema, bulkMealSchema, toScaled, validatePrecision } from "@/lib/validators-meal";
import { getMessPrecision, isDateLocked, isMonthClosed } from "@/lib/meal-helpers";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

// GET /api/messes/:id/meals?date=YYYY-MM-DD  or ?year=2026&month=9  (returns all for month)
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0]) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  const year = url.searchParams.get("year");
  const month = url.searchParams.get("month");

  if (date) {
    const rows = await db.select().from(mealRecords).where(and(eq(mealRecords.messId, id), eq(mealRecords.date, date)));
    return NextResponse.json({ meals: rows, date, locked: await isDateLocked(id, date), closed: await isMonthClosed(id, date) });
  }
  if (year && month) {
    const y = Number(year);
    const m = Number(month);
    const prefix = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-`;
    // SQLite LIKE
    const rows = await db.select().from(mealRecords).where(eq(mealRecords.messId, id));
    const filtered = rows.filter((r) => r.date.startsWith(prefix));
    return NextResponse.json({ meals: filtered, year: y, month: m });
  }
  return NextResponse.json({ error: "Provide date=YYYY-MM-DD or year+month" }, { status: 400 });
}

// POST single entry or bulk (via entries array)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0]) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  // try single first
  const singleParsed = mealEntrySchema.safeParse(body);
  const bulkParsed = bulkMealSchema.safeParse(body);

  let entries: { memberId: string; mealTypeId: string; date: string; quantity: number; reason?: string }[] = [];
  let commonDate: string | null = null;
  let reason: string | undefined;

  if (singleParsed.success) {
    entries = [singleParsed.data];
    commonDate = singleParsed.data.date;
    reason = singleParsed.data.reason;
  } else if (bulkParsed.success) {
    entries = bulkParsed.data.entries.map((e) => ({ ...e, date: bulkParsed.data.date, reason: bulkParsed.data.reason }));
    commonDate = bulkParsed.data.date;
    reason = bulkParsed.data.reason;
  } else {
    return NextResponse.json({ error: "Validation failed", single: singleParsed.error?.flatten(), bulk: bulkParsed.error?.flatten() }, { status: 400 });
  }

  if (!commonDate) return NextResponse.json({ error: "Missing date" }, { status: 400 });

  // checks: locked / closed
  if (await isDateLocked(id, commonDate)) {
    // only manager can correct locked date (via update below, but we still allow with audit)
    if (access[0].role !== "manager" && access[0].role !== "assistant_manager") {
      return NextResponse.json({ error: "Date is locked. Only manager can edit." }, { status: 423 });
    }
  }
  if (await isMonthClosed(id, commonDate)) {
    if (access[0].role !== "manager") return NextResponse.json({ error: "Month is closed. Only manager can edit." }, { status: 423 });
  }

  const precision = await getMessPrecision(id);
  const now = new Date().toISOString();
  let upserted = 0;
  let errors: string[] = [];

  for (const e of entries) {
    const scaled = toScaled(e.quantity);
    if (!validatePrecision(scaled, precision)) {
      errors.push(`Member ${e.memberId} qty ${e.quantity} invalid precision ${precision === 50 ? "0.5" : "1"}`);
      continue;
    }
    // validate member belongs to mess
    const memberExists = await db.select().from(messMembers).where(and(eq(messMembers.id, e.memberId), eq(messMembers.messId, id))).limit(1);
    if (!memberExists[0]) {
      errors.push(`Member ${e.memberId} not in mess`);
      continue;
    }
    // validate meal type belongs to mess and active
    const typeExists = await db.select().from(mealTypes).where(and(eq(mealTypes.id, e.mealTypeId), eq(mealTypes.messId, id))).limit(1);
    if (!typeExists[0]) {
      errors.push(`Meal type ${e.mealTypeId} invalid`);
      continue;
    }

    const existing = await db
      .select()
      .from(mealRecords)
      .where(and(eq(mealRecords.messId, id), eq(mealRecords.memberId, e.memberId), eq(mealRecords.date, e.date), eq(mealRecords.mealTypeId, e.mealTypeId)))
      .limit(1);

    if (existing[0]) {
      if (existing[0].quantityScaled === scaled) continue; // no change
      // correction with audit
      await db
        .update(mealRecords)
        .set({ quantityScaled: scaled, updatedBy: user.id, updatedAt: now })
        .where(eq(mealRecords.id, existing[0].id));
      await db.insert(mealCorrections).values({
        id: nanoid(),
        mealRecordId: existing[0].id,
        beforeScaled: existing[0].quantityScaled,
        afterScaled: scaled,
        reason: reason || null,
        changedBy: user.id,
        createdAt: now,
      });
      await db.insert(auditLogs).values({
        id: nanoid(),
        messId: id,
        actorId: user.id,
        action: "correct",
        entityType: "meal_record",
        entityId: existing[0].id,
        beforeJson: JSON.stringify({ quantityScaled: existing[0].quantityScaled }),
        afterJson: JSON.stringify({ quantityScaled: scaled }),
        reason: reason || null,
        createdAt: now,
      });
      upserted++;
    } else {
      await db.insert(mealRecords).values({
        id: nanoid(),
        messId: id,
        memberId: e.memberId,
        date: e.date,
        mealTypeId: e.mealTypeId,
        quantityScaled: scaled,
        createdBy: user.id,
        updatedBy: user.id,
        createdAt: now,
        updatedAt: now,
      });
      upserted++;
    }
  }

  return NextResponse.json({ ok: true, upserted, errors, date: commonDate });
}
