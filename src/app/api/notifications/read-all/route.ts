import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getDb } from "@/db";
import { notifications } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  // update all unread for user
  const rows = await db.select().from(notifications).where(eq(notifications.userId, user.id));
  for (const r of rows.filter((x) => !x.isRead)) {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, r.id));
  }
  return NextResponse.json({ ok: true });
}
