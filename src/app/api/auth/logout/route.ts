import { NextResponse } from "next/server";
import { clearSessionCookie, getCookieName, verifySessionToken, hashToken } from "@/lib/auth";
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
        // tokens now stored via hashToken(fullToken) — unique per JWT (jti)
        const hash = hashToken(token);
        await db.delete(sessions).where(eq(sessions.tokenHash, hash));
      } catch {}
    }
  }
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", clearSessionCookie());
  return res;
}
