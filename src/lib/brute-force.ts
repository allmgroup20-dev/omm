import { getDb } from "@/db";
import { loginHistory } from "@/db/schema";
import { and, eq, gte } from "drizzle-orm";

export async function isBruteForced(userId: string | null, ip: string, email: string): Promise<boolean> {
  const db = getDb();
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString(); // last 15 min
  // count failures for ip OR email OR userId
  const rows = await db.select().from(loginHistory);
  const recentFailures = rows.filter((r) => !r.success && r.createdAt >= since && (r.ip === ip || r.email === email.toLowerCase() || (userId && r.userId === userId)));
  return recentFailures.length >= 5;
}

export async function recordLoginAttempt(userId: string | null, email: string, ip: string, userAgent: string | null, success: boolean) {
  const db = getDb();
  const { nanoid } = await import("nanoid");
  await db.insert(loginHistory).values({
    id: nanoid(),
    userId: userId || null,
    email: email.toLowerCase(),
    success,
    ip,
    userAgent,
    createdAt: new Date().toISOString(),
  });
}
