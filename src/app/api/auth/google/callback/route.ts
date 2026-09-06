import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import { exchangeCodeForProfile, googleConfig, isGoogleConfigured } from "@/lib/google";
import { getRequestDb } from "@/db";
import { users, sessions, loginHistory } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, createSessionToken, sessionCookie, hashToken } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// GET /api/auth/google/callback?code=...&state=... (public)
export async function GET(req: Request) {
  const { appUrl } = googleConfig();
  const fail = (msg: string) => NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent(msg)}`);

  try {
    if (!isGoogleConfigured()) return fail("Google login is not configured.");

    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (url.searchParams.get("error")) return fail("Google login cancelled.");

    const jar = await cookies();
    const savedState = jar.get("omm_oauth_state")?.value;
    if (!code || !state || !savedState || state !== savedState) {
      console.error("[google-callback] E1 state mismatch", { hasCode: !!code, hasState: !!state, hasSaved: !!savedState });
      return fail("Google login failed (E1). Please try again.");
    }

    const ip = getClientIp(req);
    const rl = rateLimit(`google-cb:${ip}`, 10, 60_000);
    if (!rl.allowed) return fail("Too many attempts (E2). Try later.");

    let profile;
    try {
      profile = await exchangeCodeForProfile(code);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      const cause = err instanceof Error ? (err as unknown as { cause?: unknown }).cause : undefined;
      console.error("[google-callback] E3 exchange/verify failed", {
        message: msg,
        stack: stack?.slice(0, 800),
        cause: cause ? String(cause).slice(0, 400) : undefined,
        hasCode: !!code,
        codeLen: code?.length,
        statePrefix: state?.slice(0, 8),
        savedStatePrefix: savedState?.slice(0, 8),
        ip,
        appUrl,
        redirectUri: googleConfig().redirectUri,
        clientIdLen: googleConfig().clientId.length,
        requestId: req.headers.get("x-request-id") || req.headers.get("cf-ray") || "n/a",
      });
      // Preserve sub-code (E3.1/E3.2/E3.3/E3.4) if present, otherwise generic E3
      const codeMatch = msg.match(/\(E3\.\d\)/);
      const suffix = codeMatch ? ` ${codeMatch[0]}` : "";
      return fail(`Google verification failed${suffix} (E3). ${msg.slice(0, 120)} — Try again.`);
    }
    if (!profile.emailVerified) return fail("Your Google email is not verified (E4).");

    console.error("[google-callback] E5 checkpoint: profile resolved", { email: profile.email.slice(0, 6) + "***", ip, appUrl });
    const db = await getRequestDb();
    console.error("[google-callback] E5 checkpoint: db acquired");
    const now = new Date().toISOString();
    const email = profile.email.toLowerCase().trim();
    const userAgent = req.headers.get("user-agent") || null;

    // Priority 1: match by stable googleSub (survives email changes via profile edit)
    // Priority 2: fallback to email match (legacy + first-time link)
    // Wrapped in try/catch for D1 not yet migrated (no google_sub column)
    let existing: (typeof users.$inferSelect)[] = [];
    let matchBy: string = "googleSub";
    try {
      existing = await db.select().from(users).where(eq(users.googleSub, profile.sub)).limit(1);
      if (!existing[0]) {
        existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
        matchBy = "email";
      }
    } catch (e: unknown) {
      const emsg = e instanceof Error ? e.message : String(e);
      if (emsg.includes("google_sub") || emsg.includes("no such column")) {
        console.error("[google-callback] google_sub column missing, fallback to email only", emsg.slice(0, 200));
        existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
        matchBy = "email";
      } else throw e;
    }
    console.error("[google-callback] E5 checkpoint: user lookup done", { exists: !!existing[0], matchBy });
    let userId: string;
    if (existing[0]) {
      // Auto-link: existing account signs in with Google (same verified email or same googleSub)
      if (existing[0].status !== "active") return fail("Account suspended. Contact admin.");
      userId = existing[0].id;
      const updates: Record<string, unknown> = { updatedAt: now };
      if (!existing[0].profilePhoto && profile.picture) updates.profilePhoto = profile.picture;
      if (!existing[0].emailVerified) updates.emailVerified = true;
      // Persist googleSub if not yet stored (migration for old users)
      if (!existing[0].googleSub) updates.googleSub = profile.sub;
      // If user changed email via profile edit, sync back only if googleSub was already linked
      // (prevents hijack: only update email if matchBy was googleSub, meaning ownership proven)
      if (matchBy === "googleSub" && existing[0].email !== email) {
        updates.email = email;
        updates.emailVerified = true;
        console.error("[google-callback] E5 checkpoint: syncing email via googleSub", { oldEmail: existing[0].email, newEmail: email });
      }
      if (Object.keys(updates).length > 1) {
        try {
          await db.update(users).set(updates as never).where(eq(users.id, userId));
        } catch (e: unknown) {
          const em = e instanceof Error ? e.message : String(e);
          if (em.includes("google_sub") || em.includes("no such column")) {
            console.error("[google-callback] update google_sub missing, retry without it", em.slice(0, 200));
            const fallback = { ...updates };
            delete (fallback as Record<string, unknown>).googleSub;
            if (Object.keys(fallback).length > 1) await db.update(users).set(fallback as never).where(eq(users.id, userId));
          } else throw e;
        }
      }
      console.error("[google-callback] E5 checkpoint: existing user linked", { userId, matchBy });
    } else {
      // Auto-register: no password known to the user (Google-only account)
      userId = nanoid();
      try {
        await db.insert(users).values({
          id: userId,
          email,
          phone: null,
          passwordHash: await hashPassword(nanoid(32)),
          fullName: profile.name,
          profilePhoto: profile.picture || null,
          emailVerified: true,
          googleSub: profile.sub,
          status: "active",
          createdAt: now,
          updatedAt: now,
        });
      } catch (e: unknown) {
        const em = e instanceof Error ? e.message : String(e);
        if (em.includes("google_sub") || em.includes("no such column")) {
          console.error("[google-callback] insert google_sub missing, retry without", em.slice(0,200));
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
        } else throw e;
      }
      console.error("[google-callback] E5 checkpoint: new user inserted", { userId });
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
    console.error("[google-callback] E5 checkpoint: loginHistory inserted");

    const token = await createSessionToken(userId);
    console.error("[google-callback] E5 checkpoint: token signed", { tokenLen: token.length });
    await db.insert(sessions).values({
      id: nanoid(),
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: now,
      ip,
      userAgent,
    });
    console.error("[google-callback] E5 checkpoint: session inserted");

    const res = NextResponse.redirect(`${appUrl}/dashboard`);
    res.headers.set("Set-Cookie", sessionCookie(token));
    res.cookies.set("omm_oauth_state", "", { path: "/", maxAge: 0 });
    console.error("[google-callback] E5 success: redirecting to dashboard", { userId });
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    const cause = err instanceof Error ? (err as unknown as { cause?: unknown }).cause : undefined;
    console.error("[google-callback] E5 downstream failure (will redirect, not 500)", {
      message: msg,
      stack: stack?.slice(0, 900),
      cause: cause ? String(cause).slice(0, 500) : undefined,
      requestId: req.headers.get("cf-ray") || req.headers.get("x-request-id") || "n/a",
      appUrl,
    });
    // Preserve inner E3.x if the throw came from exchange path
    const m = msg.match(/\(E3\.\d\)/);
    if (m) return fail(`Google verification failed ${m[0]} (E3). ${msg.slice(0, 120)} — Try again.`);
    if (msg.includes("AUTH_SECRET")) return fail("Server misconfiguration (E5-AUTH). Contact admin.");
    if (msg.includes("DB") || msg.includes("D1") || msg.includes("drizzle") || msg.includes("better-sqlite3")) return fail(`Database unavailable (E5-DB). ${msg.slice(0, 80)} — Try again.`);
    return fail(`Google login failed (E5). ${msg.slice(0, 100)} — Try again.`);
  }
}
