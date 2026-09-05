import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { mealRecords, messMembers, mealTypes } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getDaysInMonth } from "@/lib/calendar";

// GET ?year=2026&month=9 -> matrix { date -> memberId -> mealTypeId -> quantity }
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0]) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const year = Number(url.searchParams.get("year"));
  const month = Number(url.searchParams.get("month"));
  if (!year || !month || month < 1 || month > 12) return NextResponse.json({ error: "year/month required" }, { status: 400 });

  const days = getDaysInMonth(year, month);
  const mm = String(month).padStart(2, "0");
  const start = `${year}-${mm}-01`;
  const end = `${year}-${mm}-${String(days).padStart(2, "0")}`;

  const members = await db.select().from(messMembers).where(eq(messMembers.messId, id));
  const types = await db.select().from(mealTypes).where(eq(mealTypes.messId, id));
  const activeTypes = types.filter((t) => t.isActive).sort((a, b) => a.sortOrder - b.sortOrder);

  // fetch all records for month via like prefix or manual filter (SQLite no date range index friendly but ok)
  const all = await db.select().from(mealRecords).where(eq(mealRecords.messId, id));
  const filtered = all.filter((r) => r.date >= start && r.date <= end);

  // build matrix
  const matrix: Record<string, Record<string, Record<string, number>>> = {}; // date -> memberId -> mealTypeId -> quantityScaled
  for (const r of filtered) {
    if (!matrix[r.date]) matrix[r.date] = {};
    if (!matrix[r.date][r.memberId]) matrix[r.date][r.memberId] = {};
    matrix[r.date][r.memberId][r.mealTypeId] = r.quantityScaled;
  }

  // totals
  const memberTotals: Record<string, number> = {};
  const dailyTotals: Record<string, number> = {};
  let grandTotalScaled = 0;
  for (const r of filtered) {
    memberTotals[r.memberId] = (memberTotals[r.memberId] || 0) + r.quantityScaled;
    dailyTotals[r.date] = (dailyTotals[r.date] || 0) + r.quantityScaled;
    grandTotalScaled += r.quantityScaled;
  }

  return NextResponse.json({
    year,
    month,
    days,
    mealTypes: activeTypes,
    members: members.map((m) => ({ id: m.id, userId: m.userId, role: m.role, status: m.status })),
    matrix,
    memberTotals,
    dailyTotals,
    grandTotalScaled,
    grandTotal: grandTotalScaled / 100,
  });
}
