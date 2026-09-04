import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getDb } from "@/db";
import { mealCorrections, messMembers, mealRecords } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0]) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);
  const rows = await db.select().from(mealCorrections).limit(limit);
  // filter by mess via join to mealRecords (simplified: return all recent, client filters)
  const recs = await db.select().from(mealRecords).where(eq(mealRecords.messId, id));
  const recIds = new Set(recs.map((r) => r.id));
  const filtered = rows.filter((c) => recIds.has(c.mealRecordId));
  return NextResponse.json({ corrections: filtered });
}
