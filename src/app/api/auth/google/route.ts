import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { buildGoogleAuthUrl, isGoogleConfigured } from "@/lib/google";
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
  res.cookies.set("omm_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 300, // 5 minutes
  });
  return res;
}
