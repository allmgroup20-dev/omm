import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { sessions, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { clearSessionCookie } from "@/lib/auth";
import { nanoid } from "nanoid";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  await db.delete(sessions).where(eq(sessions.userId, user.id));
  await db.insert(auditLogs).values({ id: nanoid(), actorId: user.id, action: "logout_all", entityType: "session", entityId: user.id, createdAt: new Date().toISOString() });
  const res = NextResponse.json({ ok: true, message: "Logged out from all devices" });
  res.headers.set("Set-Cookie", clearSessionCookie());
  return res;
}
