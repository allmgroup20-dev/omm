import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { marketEntries, marketEntryItems, messMembers } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getRequestDb();
  const user = await getCurrentUser();
  if (user) {
    const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  }

  const entries = await db.select().from(marketEntries).where(eq(marketEntries.messId, id));
  const active = entries.filter((e) => e.status === "active");
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const ym = todayStr.slice(0, 7); // YYYY-MM

  const today = active.filter((e) => e.date === todayStr);
  const thisWeekEntries: typeof active = [];
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  for (const e of active) {
    if (e.date >= weekAgo.toISOString().slice(0, 10)) thisWeekEntries.push(e);
  }
  const thisMonth = active.filter((e) => e.date.startsWith(ym));

  const totalToday = today.reduce((a, e) => a + e.finalPaisa, 0);
  const totalWeek = thisWeekEntries.reduce((a, e) => a + e.finalPaisa, 0);
  const totalMonth = thisMonth.reduce((a, e) => a + e.finalPaisa, 0);
  const avgDaily = thisMonth.length ? Math.round(totalMonth / Math.max(1, new Set(thisMonth.map((e) => e.date)).size)) : 0;

  // category-wise (via items)
  const items = await db.select().from(marketEntryItems);
  // filter items belonging to this mess's entries
  const entryIds = new Set(active.map((e) => e.id));
  const messItems = items.filter((it) => entryIds.has(it.entryId));

  const categorySpend: Record<string, number> = {};
  const productSpend: Record<string, number> = {};
  const vendorSpend: Record<string, number> = {};
  for (const it of messItems) {
    const cat = it.categoryNameSnapshot || "অন্যান্য";
    categorySpend[cat] = (categorySpend[cat] || 0) + it.totalPaisa;
    productSpend[it.productNameSnapshot] = (productSpend[it.productNameSnapshot] || 0) + it.totalPaisa;
  }
  for (const e of active) {
    const key = e.vendorId || "Unknown";
    vendorSpend[key] = (vendorSpend[key] || 0) + e.finalPaisa;
  }

  const highestCategory = Object.entries(categorySpend).sort((a, b) => b[1] - a[1])[0] || null;
  const topProducts = Object.entries(productSpend).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return NextResponse.json({
    today: { count: today.length, totalPaisa: totalToday },
    week: { count: thisWeekEntries.length, totalPaisa: totalWeek },
    month: { count: thisMonth.length, totalPaisa: totalMonth },
    avgDailyPaisa: avgDaily,
    categorySpend,
    productSpend: topProducts,
    vendorSpend,
    highestCategory,
    totalEntries: active.length,
  });
}
