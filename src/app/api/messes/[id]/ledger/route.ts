import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getDb } from "@/db";
import { ledgerEntries, messMembers } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0]) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const memberId = url.searchParams.get("memberId");
  if (!memberId) return NextResponse.json({ error: "memberId required" }, { status: 400 });

  // verify member belongs to mess
  const mem = await db.select().from(messMembers).where(and(eq(messMembers.id, memberId), eq(messMembers.messId, id))).limit(1);
  if (!mem[0]) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  // Member can only see own ledger unless manager
  if (mem[0].userId !== user.id && !["manager", "assistant_manager"].includes(access[0].role)) {
    return NextResponse.json({ error: "Forbidden — can only view own ledger" }, { status: 403 });
  }

  const rows = await db.select().from(ledgerEntries).where(and(eq(ledgerEntries.messId, id), eq(ledgerEntries.memberId, memberId))).orderBy(desc(ledgerEntries.createdAt));
  return NextResponse.json({ ledger: rows, memberId });
}
