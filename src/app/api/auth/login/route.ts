import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/validators";
import { verifyPassword, createSessionToken, sessionCookie } from "@/lib/auth";
import { getRequestDb } from "@/db";
import { users, sessions, loginHistory } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { isBruteForced } from "@/lib/brute-force";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = rateLimit(`login:${ip}`, 5, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Too many login attempts. Try later." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });

  const { email, password } = parsed.data;
  const db = await getRequestDb();
  const now = new Date().toISOString();

  // brute-force check (5 failures in 15 min)
  if (await isBruteForced(null, ip, email)) {
    return NextResponse.json({ error: "Too many failed attempts. Try after 15 minutes." }, { status: 429 });
  }

  const rows = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
  const user = rows[0];
  if (!user) {
    return NextResponse.json({ error: "ইমেইল বা পাসওয়ার্ড ভুল" }, { status: 401 });
  }
  if (user.status !== "active") {
    return NextResponse.json({ error: "Account suspended. Contact admin." }, { status: 403 });
  }
  const ok = await verifyPassword(password, user.passwordHash);
  await db.insert(loginHistory).values({
    id: nanoid(),
    userId: user.id,
    email: email.toLowerCase(),
    success: ok,
    ip,
    userAgent: req.headers.get("user-agent") || null,
    createdAt: now,
  });
  if (!ok) return NextResponse.json({ error: "ইমেইল বা পাসওয়ার্ড ভুল" }, { status: 401 });

  const token = await createSessionToken(user.id);
  await db.insert(sessions).values({
    id: nanoid(),
    userId: user.id,
    tokenHash: token.slice(0, 32),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: now,
    ip,
    userAgent: req.headers.get("user-agent") || null,
  });

  // suspicious detection: many failures in last 10 min (simple count)
  // architecture-ready — currently just log

  const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email, fullName: user.fullName } });
  res.headers.set("Set-Cookie", sessionCookie(token));
  return res;
}
