import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/",
  "/s",
  "/listings",
  "/properties",
  "/about",
  "/how-it-works",
  "/login",
  "/register",
  "/forgot",
  "/reset",
  "/share",
  "/api/share",
  "/api/auth/register",
  "/api/auth/login",
  "/api/auth/forgot",
  "/api/auth/reset",
  "/api/auth/google",
  "/api/listings",
];

// Simple in-memory CSRF double-submit for state-changing API calls
// Token is set as cookie `omm_csrf` on first GET, then required as header `x-csrf-token` for POST/PATCH/DELETE
const PUBLIC_GET_API = [/^\/api\/messes\/[^\/]+\/dashboard(\/.*)?$/, /^\/api\/messes\/[^\/]+\/finance\/balances$/, /^\/api\/messes\/[^\/]+\/market\/entries$/, /^\/api\/messes\/[^\/]+\/deposits$/, /^\/api\/messes\/[^\/]+\/meals(\/.*)?$/, /^\/api\/messes\/[^\/]+\/analytics$/, /^\/api\/auth\/me$/];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return true;
  if (pathname.match(/^\/messes\/[^\/]+\/dashboard(\/.*)?$/)) return true;
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.startsWith("/public")) return true;
  if (pathname.match(/\.(svg|png|jpg|jpeg|ico|css|js|woff2?)$/)) return true;
  return false;
}

function addSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  // X-Request-Id for tracing
  res.headers.set("X-Request-Id", crypto.randomUUID());
  return res;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public paths
  if (isPublic(pathname)) {
    const res = NextResponse.next();
    // Set CSRF cookie for public GET if missing (Secure in prod)
    if (!req.cookies.get("omm_csrf")?.value && req.method === "GET") {
      const token = crypto.randomUUID();
      const isProd = process.env.NODE_ENV === "production";
      res.cookies.set("omm_csrf", token, { httpOnly: false, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7, secure: isProd });
    }
    return addSecurityHeaders(res);
  }

  // Public GET for dashboard data — read-only
  if (req.method === "GET" && PUBLIC_GET_API.some((r) => r.test(pathname))) {
    const res = NextResponse.next();
    if (!req.cookies.get("omm_csrf")?.value) {
      const token2 = crypto.randomUUID();
      const isProd = process.env.NODE_ENV === "production";
      res.cookies.set("omm_csrf", token2, { httpOnly: false, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7, secure: isProd });
    }
    return addSecurityHeaders(res);
  }

  // Auth check
  const token = req.cookies.get("omm_session")?.value;
  if (!token && pathname.startsWith("/api/")) {
    return addSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }
  if (!token && !pathname.startsWith("/api/")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return addSecurityHeaders(NextResponse.redirect(url));
  }

  // CSRF double-submit: if cookie exists, header must match; if no cookie yet, allow and set one
  if (["POST", "PATCH", "PUT", "DELETE"].includes(req.method) && pathname.startsWith("/api/") && !PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    const csrfCookie = req.cookies.get("omm_csrf")?.value;
    const csrfHeader = req.headers.get("x-csrf-token");
    if (csrfCookie && csrfHeader && csrfHeader !== csrfCookie) {
      return addSecurityHeaders(NextResponse.json({ error: "CSRF token mismatch" }, { status: 403 }));
    }
    // If cookie exists but header missing, allow for backwards compat (will be strict after UI updated to send x-csrf-token)
    // TODO: enforce strict after all clients send header
  }

  const res = NextResponse.next();
  // Ensure CSRF cookie exists for authenticated GETs (Secure in prod)
  if (!req.cookies.get("omm_csrf")?.value && req.method === "GET" && !pathname.startsWith("/api/")) {
    const csrf = crypto.randomUUID();
    const isProd = process.env.NODE_ENV === "production";
    res.cookies.set("omm_csrf", csrf, { httpOnly: false, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7, secure: isProd });
  }

  // Rate limit hint headers (actual limiting in route handlers via rateLimit())
  res.headers.set("X-RateLimit-Policy", "100 req/min per IP; auth 5 req/min");

  return addSecurityHeaders(res);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
