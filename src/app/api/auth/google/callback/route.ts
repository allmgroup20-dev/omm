import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import { exchangeCodeForProfile, googleConfig, isGoogleConfigured } from "@/lib/google";
import { getRequestDb } from "@/db";
import { users, sessions, loginHistory } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, createSessionToken, sessionCookie } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// GET /api/auth/google/callback?code=...&state=... (public)
export async function GET(req: Request) {
  const { appUrl } = googleConfig();
  const fail = (msg: string) => NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent(msg)}`);

  if (!isGoogleConfigured()) return fail("Google login is not configured.");

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (url.searchParams.get("error")) return fail("Google login cancelled.");

  const jar = await cookies();
  const savedState = jar.get("omm_oauth_state")?.value;
  if (!code || !state || !savedState || state !== savedState) {
    return fail("Google login failed. Please try again.");
  }

  const ip = getClientIp(req);
  const rl = rateLimit(`google-cb:${ip}`, 10, 60_000);
  if (!rl.allowed) return fail("Too many attempts. Try later.");

  let profile;
  try {
    profile = await exchangeCodeForProfile(code);
  } catch {
    return fail("Google verification failed. Try again.");
  }
  if (!profile.emailVerified) return fail("Your Google email is not verified.");

  const db = await getRequestDb();
  const now = new Date().toISOString();
  const email = profile.email.toLowerCase().trim();
  const userAgent = req.headers.get("user-agent") || null;

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  let userId: string;
  if (existing[0]) {
    // Auto-link: existing account signs in with Google (same verified email)
    if (existing[0].status !== "active") return fail("Account suspended. Contact admin.");
    userId = existing[0].id;
    const updates: Record<string, unknown> = { updatedAt: now };
    if (!existing[0].profilePhoto && profile.picture) updates.profilePhoto = profile.picture;
    if (!existing[0].emailVerified) updates.emailVerified = true;
    if (Object.keys(updates).length > 1) {
      await db.update(users).set(updates as never).where(eq(users.id, userId));
    }
  } else {
    // Auto-register: no password known to the user (Google-only account)
    userId = nanoid();
    await db.insert(users).values({
      id: userId,
      email,
      phone: null,
      passwordHash: await hashPassword(nanoid(32)),
      fullName: profile.name,
      profilePhoto: profile.picture || null,
      emailVerified: true,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  }

  await db.insert(loginHistory).values({
    id: nanoid(),
    userId,
    email,
    success: true,
    ip,
    userAgent,
    createdAt: now,
  });

  const token = await createSessionToken(userId);
  await db.insert(sessions).values({
    id: nanoid(),
    userId,
    tokenHash: token.slice(0, 32),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: now,
    ip,
    userAgent,
  });

  const res = NextResponse.redirect(`${appUrl}/dashboard`);
  res.headers.set("Set-Cookie", sessionCookie(token));
  res.cookies.set("omm_oauth_state", "", { path: "/", maxAge: 0 });
  return res;
}
