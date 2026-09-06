import { NextResponse } from "next/server";
import { getRequestDb } from "@/db";
import { messShareTokens, messes, messMembers, users, deposits, ledgerEntries } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { computeMonthlyFinance } from "@/lib/finance";
import { memberDisplayName } from "@/lib/mess";

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

  // per-member meals + financials
  const byMember: Record<string, number> = {};
  for (const r of finance.monthMeals) {
    const v = byMember[r.memberId] || 0;
    byMember[r.memberId] = v + r.quantityScaled;
  }

  // resolve names + per-member financials
  const userRows = await db.select().from(users);
  const userMap = new Map(userRows.map((u) => [u.id, u.fullName]));
  const prefix = `${ym}-`;
  const depRows = await db.select().from(deposits).where(eq(deposits.messId, share[0].messId));
  const ledgerRows = await db.select().from(ledgerEntries).where(eq(ledgerEntries.messId, share[0].messId));

  const membersFinance = members
    .filter((m) => m.status === "active")
    .map((m) => {
      const scaled = byMember[m.id] || 0;
      const totalMeals = scaled / 100;
      const mealCostPaisa = Math.round((scaled * finance.mealRatePaisa) / 100);
      const depositPaisa = depRows.filter((d) => d.memberId === m.id && d.status === "active" && d.date.startsWith(prefix)).reduce((a, r) => a + r.amountPaisa, 0);
      const ledgers = ledgerRows.filter((r) => r.memberId === m.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const balancePaisa = ledgers.length ? ledgers[ledgers.length - 1].balancePaisa : 0;
      const status = balancePaisa > 0 ? "advance" : balancePaisa < 0 ? "due" : "settled";
      const fullName = memberDisplayName(m as never, { fullName: userMap.get(m.userId || "") || "" } as never) || m.displayName || "সদস্য";
      return { memberId: m.id, fullName, displayName: m.displayName, totalMeals, mealCostPaisa, depositPaisa, balancePaisa, status };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "bn", { sensitivity: "base" }));

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
    },
    membersFinance,
  });
}
