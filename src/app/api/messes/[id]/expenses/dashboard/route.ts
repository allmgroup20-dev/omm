import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { expenses, messMembers } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0]) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const ym = url.searchParams.get("ym"); // YYYY-MM
  const all = await db.select().from(expenses).where(eq(expenses.messId, id));

  const pending = all.filter((e) => e.status === "pending");
  const approved = all.filter((e) => e.status === "approved");
  const rejected = all.filter((e) => e.status === "rejected");

  const totalPendingPaisa = pending.reduce((a, e) => a + e.amountPaisa, 0);
  const totalApprovedPaisa = approved.reduce((a, e) => a + e.amountPaisa, 0);

  let monthFiltered = all;
  if (ym) monthFiltered = all.filter((e) => e.date.startsWith(ym));

  const monthTotal = monthFiltered.filter((e) => e.status === "approved").reduce((a, e) => a + e.amountPaisa, 0);

  return NextResponse.json({
    counts: { pending: pending.length, approved: approved.length, rejected: rejected.length, total: all.length },
    totals: { pendingPaisa: totalPendingPaisa, approvedPaisa: totalApprovedPaisa, monthPaisa: monthTotal },
    month: ym || null,
    monthTotalPaisa: monthTotal,
  });
}
