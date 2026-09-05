import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { listings, moderationLogs, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { isSuperAdmin } from "@/lib/admin";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isSuperAdmin(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const action = body?.action as string; // approve|reject|flag
  const reason = (body?.reason as string)?.trim() || null;
  if (!["approve", "reject", "flag", "pause"].includes(action)) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  const db = await getRequestDb();
  const rows = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date().toISOString();
  let newStatus: string;
  if (action === "approve") newStatus = "published";
  else if (action === "reject") newStatus = "rejected";
  else if (action === "pause") newStatus = "paused";
  else newStatus = "pending";

  await db.update(listings).set({ status: newStatus, moderationReason: reason, updatedAt: now, publishedAt: newStatus === "published" ? now : rows[0].publishedAt }).where(eq(listings.id, id));
  await db.insert(moderationLogs).values({ id: nanoid(), listingId: id, moderatorId: user.id, action, reason, createdAt: now });
  await db.insert(auditLogs).values({ id: nanoid(), actorId: user.id, action, entityType: "listing", entityId: id, afterJson: JSON.stringify({ status: newStatus }), reason, createdAt: now });

  const after = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
  return NextResponse.json({ ok: true, listing: after[0] });
}
