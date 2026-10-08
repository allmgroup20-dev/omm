import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { auditLogs, messMembers, users } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0]) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  // only manager/assistant can view full audit; members see own? For now manager only
  if (!["manager", "assistant_manager"].includes(access[0].role)) return NextResponse.json({ error: "Forbidden — manager only" }, { status: 403 });

  const url = new URL(req.url);
  const entityType = url.searchParams.get("entityType");
  const action = url.searchParams.get("action");
  const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);
  const offset = Number(url.searchParams.get("offset") || 0);

  let rows = await db.select().from(auditLogs).where(eq(auditLogs.messId, id)).orderBy(desc(auditLogs.createdAt)).limit(limit).offset(offset);
  if (entityType) rows = rows.filter((r) => r.entityType === entityType);
  if (action) rows = rows.filter((r) => r.action === action);

  // never allow delete — no DELETE endpoint

  const withNames = await Promise.all(
    rows.map(async (r) => {
      let actorName: string | null = null;
      if (r.actorId) {
        const u = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, r.actorId)).limit(1);
        actorName = u[0]?.fullName || null;
      }
      return { ...r, actorName };
    }),
  );

  return NextResponse.json({ auditLogs: withNames, total: withNames.length });
}
