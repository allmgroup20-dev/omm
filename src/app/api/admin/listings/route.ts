import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getDb } from "@/db";
import { listings } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { isSuperAdmin } from "@/lib/admin";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isSuperAdmin(user.id))) return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "pending";
  const limit = Math.min(50, Number(url.searchParams.get("limit") || 20));
  const offset = Number(url.searchParams.get("offset") || 0);

  const db = getDb();
  // Proper SQL where status = ? with pagination count
  const allPending = await db.select().from(listings).where(eq(listings.status, status)).orderBy(desc(listings.createdAt));
  const total = allPending.length; // In prod, use SELECT COUNT(*) WHERE status=?
  const paged = allPending.slice(offset, offset + limit);

  return NextResponse.json({ listings: paged, pagination: { total, page: Math.floor(offset / limit) + 1, limit } });
}
