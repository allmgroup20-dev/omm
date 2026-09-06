import { cookies } from "next/headers";
import { verifySessionToken, getCookieName } from "./auth";
import { getRequestDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get(getCookieName())?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload) return null;
  const db = await getRequestDb();
  try {
    const rows = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    if (!rows[0] || rows[0].status !== "active") return null;
    return rows[0];
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    // Graceful fallback if google_sub column not yet migrated on D1 (SELECT * includes new column)
    if (msg.includes("google_sub") || msg.includes("no such column")) {
      console.error("[session] fallback: google_sub column missing, retry without it", msg.slice(0, 200));
      // Raw fallback: select without google_sub via direct SQL string using drizzle's iteration?
      // Use db.execute if available (D1/better-sqlite3 both support sql template via `db`? fallback to raw query)
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = (db as any).all
          ? (db as any).all("SELECT id, email, phone, phone_verified, password_hash, full_name, profile_photo, email_verified, status, emergency_contact, notes, created_at, updated_at FROM users WHERE id = ? LIMIT 1", [payload.userId])
          : null;
        if (raw && raw[0]) {
          const r = raw[0] as Record<string, unknown>;
          return {
            id: r.id as string,
            email: r.email as string,
            phone: r.phone as string | null,
            phoneVerified: Boolean(r.phone_verified),
            passwordHash: r.password_hash as string,
            fullName: r.full_name as string,
            profilePhoto: r.profile_photo as string | null,
            emailVerified: Boolean(r.email_verified),
            status: r.status as string,
            emergencyContact: r.emergency_contact as string | null,
            notes: r.notes as string | null,
            googleSub: null,
            createdAt: r.created_at as string,
            updatedAt: r.updated_at as string,
          } as unknown as typeof users.$inferSelect;
        }
      } catch {
        // fall through
      }
    }
    throw e;
  }
}

export async function requireCurrentUser() {
  const u = await getCurrentUser();
  if (!u) throw new Error("Unauthorized");
  return u;
}
