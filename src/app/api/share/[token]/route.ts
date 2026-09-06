import { NextResponse } from "next/server";
import { getRequestDb } from "@/db";
import { messShareTokens, messes, messMembers, users, marketEntries, expenses, mealRecords } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { computeMonthlyFinance } from "@/lib/finance";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = await getRequestDb();
  const share = await db.select().from(messShareTokens).where(eq(messShareTokens.token, token)).limit(1);
  if (!share[0]) return NextResponse.json({ error: "Invalid share link" }, { status: 404 });
  if (share[0].expiresAt && new Date(share[0].expiresAt) < new Date()) return NextResponse.json({ error: "Share expired" }, { status: 410 });

  const mess = await db.select().from(messes).where(eq(messes.id, share[0].messId)).limit(1);
  if (!mess[0]) return NextResponse.json({ error: "Mess not found" }, { status: 404 });

  // public stats — read-only, no PII beyond name, balances blurred
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [year, month] = ym.split("-").map(Number);
  const finance = await computeMonthlyFinance(share[0].messId, year, month);
  const members = await db.select().from(messMembers).where(eq(messMembers.messId, share[0].messId));
  const activeMembers = members.filter((m) => m.status === "active").length;

  // per-member meals
  const byMember: Record<string, number> = {};
  for (const r of finance.monthMeals) {
    const v = byMember[r.memberId] || 0;
    byMember[r.memberId] = v + r.quantityScaled;
  }

  return NextResponse.json({
    mess: { id: mess[0].id, name: mess[0].name, code: mess[0].code, division: mess[0].division, district: mess[0].district },
    share: { token, expiresAt: share[0].expiresAt },
    ym,
    stats: {
      activeMembers,
      totalMeals: finance.totalMealsScaled / 100,
      totalMarketPaisa: finance.totalMarketPaisa,
      totalOtherPaisa: finance.totalOtherPaisa,
      mealRatePaisa: finance.mealRatePaisa,
      // per-member meals counts (scaled/100) — names resolved client via members list (limited)
      byMember: Object.entries(byMember).map(([memberId, scaled]) => ({ memberId, meals: scaled / 100 })),
    },
    members: members.filter((m) => m.status === "active").slice(0, 50).map((m) => ({ id: m.id, displayName: m.displayName, status: m.status })),
  });
}
