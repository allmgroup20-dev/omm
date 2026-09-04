import { NextResponse } from "next/server";
import { forgotSchema } from "@/lib/validators";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { SignJWT } from "jose";

function getSecret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be >=32 chars");
  return new TextEncoder().encode(s);
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = rateLimit(`forgot:${ip}`, 3, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = forgotSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });

  const { email } = parsed.data;
  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
  if (!rows[0]) {
    // do not reveal existence
    return NextResponse.json({ ok: true, message: "যদি ইমেইলটি থাকে তবে রিসেট লিংক পাঠানো হবে" });
  }
  const token = await new SignJWT({ sub: rows[0].id, purpose: "reset" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(getSecret());

  // In production send email via R2/Email service. For now return token in dev only.
  const isDev = process.env.NODE_ENV !== "production";
  return NextResponse.json({ ok: true, message: "রিসেট লিংক তৈরি হয়েছে", ...(isDev ? { resetToken: token } : {}) });
}
