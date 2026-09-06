import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { messJoinRequests, messMembers, notifications } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; requestId: string }> }) {
  const { id, requestId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0] || access[0].role !== "manager") return NextResponse.json({ error: "Only manager" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const action = body?.action as string;
  if (!["approve", "reject"].includes(action)) return NextResponse.json({ error: "action approve|reject required" }, { status: 400 });

  const reqRow = await db.select().from(messJoinRequests).where(and(eq(messJoinRequests.id, requestId), eq(messJoinRequests.messId, id))).limit(1);
  if (!reqRow[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (reqRow[0].status !== "pending") return NextResponse.json({ error: "Already decided" }, { status: 400 });

  const now = new Date().toISOString();
  if (action === "approve") {
    await db.insert(messMembers).values({ id: nanoid(), messId: id, userId: reqRow[0].userId, displayName: null, role: "member", isPrimaryManager: false, status: "active", invitedBy: user.id, joinedAt: now, createdAt: now, updatedAt: now });
    await db.update(messJoinRequests).set({ status: "approved", decidedBy: user.id, decidedAt: now } as never).where(eq(messJoinRequests.id, requestId));
    await db.insert(notifications).values({ id: nanoid(), userId: reqRow[0].userId, messId: id, type: "invitation", title: "Join approved", body: "You are now a member", isRead: false, link: `/messes/${id}`, createdAt: now });
  } else {
    await db.update(messJoinRequests).set({ status: "rejected", decidedBy: user.id, decidedAt: now } as never).where(eq(messJoinRequests.id, requestId));
    await db.insert(notifications).values({ id: nanoid(), userId: reqRow[0].userId, messId: id, type: "invitation", title: "Join rejected", body: "Request rejected", isRead: false, createdAt: now });
  }

  return NextResponse.json({ ok: true });
}
