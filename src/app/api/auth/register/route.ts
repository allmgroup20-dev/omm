import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/validators";
import { hashPassword, validatePasswordPolicy, createSessionToken, sessionCookie } from "@/lib/auth";
import { getDb } from "@/db";
import { users, sessions, loginHistory } from "@/db/schema";
import { nanoid } from "nanoid";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = rateLimit(`register:${ip}`, 5, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });

  const body = await req.json().catch(() => null);
  // Honeypot anti-spam: hidden field must be empty
  if (body?.honeypot) return NextResponse.json({ error: "Spam detected" }, { status: 400 });
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });

  const { fullName, email, phone, password } = parsed.data;
  const policyError = validatePasswordPolicy(password);
  if (policyError) return NextResponse.json({ error: policyError }, { status: 400 });

  const db = getDb();
  const now = new Date().toISOString();
  const id = nanoid();

  try {
    const hash = await hashPassword(password);
    await db.insert(users).values({
      id,
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || null,
      passwordHash: hash,
      fullName: fullName.trim(),
      profilePhoto: null,
      emailVerified: false,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    const token = await createSessionToken(id);
    // store session
    await db.insert(sessions).values({
      id: nanoid(),
      userId: id,
      tokenHash: token.slice(0, 32), // simple hash placeholder
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: now,
      ip,
      userAgent: req.headers.get("user-agent") || null,
    });

    await db.insert(loginHistory).values({
      id: nanoid(),
      userId: id,
      email: email.toLowerCase(),
      success: true,
      ip,
      userAgent: req.headers.get("user-agent") || null,
      createdAt: now,
    });

    const res = NextResponse.json({ ok: true, user: { id, email: email.toLowerCase(), fullName } });
    res.headers.set("Set-Cookie", sessionCookie(token));
    return res;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("UNIQUE") || msg.includes("unique")) {
      return NextResponse.json({ error: "ইমেইলটি ইতিমধ্যে ব্যবহৃত" }, { status: 409 });
    }
    return NextResponse.json({ error: "Registration failed", detail: msg }, { status: 500 });
  }
}
