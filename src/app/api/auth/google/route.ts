import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { buildGoogleAuthUrl, isGoogleConfigured } from "@/lib/google";
import { oauthStateCookie } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// GET /api/auth/google — start Google OAuth (public)
export async function GET(req: Request) {
  if (!isGoogleConfigured()) {
    return NextResponse.json({ error: "Google login not configured" }, { status: 503 });
  }
  const ip = getClientIp(req);
  const rl = rateLimit(`google:${ip}`, 10, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests. Try later." }, { status: 429 });

  const state = nanoid(24);
  const res = NextResponse.redirect(buildGoogleAuthUrl(state));
  // single raw header (no cookies-API mixing — see callback)
  res.headers.append("Set-Cookie", oauthStateCookie(state));
  return res;
}
