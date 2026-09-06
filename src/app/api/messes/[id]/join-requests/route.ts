import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { messJoinRequests, messMembers, notifications } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0] || access[0].role !== "manager") return NextResponse.json({ error: "Only manager" }, { status: 403 });
  const rows = await db.select().from(messJoinRequests).where(eq(messJoinRequests.messId, id));
  return NextResponse.json({ requests: rows });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  // already member?
  const existingMember = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (existingMember[0]) return NextResponse.json({ error: "Already a member" }, { status: 409 });
  const existingReq = await db.select().from(messJoinRequests).where(and(eq(messJoinRequests.messId, id), eq(messJoinRequests.userId, user.id))).limit(1);
  if (existingReq[0] && existingReq[0].status === "pending") return NextResponse.json({ error: "Request already pending" }, { status: 409 });

  const now = new Date().toISOString();
  const nid = nanoid();
  await db.insert(messJoinRequests).values({ id: nid, messId: id, userId: user.id, status: "pending", requestedAt: now, createdAt: now });

  // notify managers
  const managers = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.role, "manager")));
  for (const m of managers) {
    if (!m.userId) continue;
    await db.insert(notifications).values({ id: nanoid(), userId: m.userId, messId: id, type: "invitation", title: "New join request", body: `${user.email} wants to join`, isRead: false, link: `/messes/${id}/members`, createdAt: now });
  }

  return NextResponse.json({ ok: true, requestId: nid });
}
