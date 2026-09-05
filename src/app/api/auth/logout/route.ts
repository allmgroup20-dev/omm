import { NextResponse } from "next/server";
import { clearSessionCookie, getCookieName, verifySessionToken } from "@/lib/auth";
import { getRequestDb } from "@/db";
import { sessions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(new RegExp(`${getCookieName()}=([^;]+)`));
  const token = match?.[1];
  if (token) {
    const payload = await verifySessionToken(token);
    if (payload) {
      try {
        const db = await getRequestDb();
        // best-effort delete sessions for this token prefix
        // we stored slice(0,32) as hash, so try to delete matching
        const hash = token.slice(0, 32);
        await db.delete(sessions).where(eq(sessions.tokenHash, hash));
      } catch {}
    }
  }
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", clearSessionCookie());
  return res;
}
