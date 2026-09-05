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
  const rows = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
  if (!rows[0] || rows[0].status !== "active") return null;
  return rows[0];
}

export async function requireCurrentUser() {
  const u = await getCurrentUser();
  if (!u) throw new Error("Unauthorized");
  return u;
}
