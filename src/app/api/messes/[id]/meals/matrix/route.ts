import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getDb } from "@/db";
import { mealRecords, messMembers, mealTypes, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getMonthDates } from "@/lib/calendar";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0]) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const year = Number(url.searchParams.get("year"));
  const month = Number(url.searchParams.get("month"));
  if (!year || !month) return NextResponse.json({ error: "year and month required" }, { status: 400 });

  const dates = getMonthDates(year, month);
  const types = await db.select().from(mealTypes).where(and(eq(mealTypes.messId, id), eq(mealTypes.isActive, true)));
  const members = await db
    .select({ member: messMembers, user: users })
    .from(messMembers)
    .innerJoin(users, eq(messMembers.userId, users.id))
    .where(eq(messMembers.messId, id));

  const records = await db.select().from(mealRecords).where(eq(mealRecords.messId, id));
  const filtered = records.filter((r) => {
    const d = r.date;
    return d >= dates[0] && d <= dates[dates.length - 1];
  });

  // Build matrix: memberId -> date -> total scaled
  const matrix: Record<string, Record<string, number>> = {};
  const memberTotals: Record<string, number> = {};
  for (const r of filtered) {
    if (!matrix[r.memberId]) matrix[r.memberId] = {};
    if (!matrix[r.memberId][r.date]) matrix[r.memberId][r.date] = 0;
    matrix[r.memberId][r.date] += r.quantityScaled;
    memberTotals[r.memberId] = (memberTotals[r.memberId] || 0) + r.quantityScaled;
  }

  return NextResponse.json({
    year,
    month,
    dates,
    mealTypes: types,
    members: members.map((m) => ({
      memberId: m.member.id,
      userId: m.user.id,
      fullName: m.user.fullName,
      status: m.member.status,
    })),
    matrix,
    memberTotals,
    totalMealsScaled: Object.values(memberTotals).reduce((a, b) => a + b, 0),
  });
}
