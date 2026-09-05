import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/register", "/forgot", "/reset", "/api/auth/register", "/api/auth/login", "/api/auth/forgot", "/api/auth/reset"];

// Simple in-memory CSRF double-submit for state-changing API calls
// Token is set as cookie `omm_csrf` on first GET, then required as header `x-csrf-token` for POST/PATCH/DELETE
function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return true;
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
    // Set CSRF cookie for public GET if missing
    if (!req.cookies.get("omm_csrf")?.value && req.method === "GET") {
      const token = crypto.randomUUID();
      res.cookies.set("omm_csrf", token, { httpOnly: false, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
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

  // CSRF check for state-changing API calls (POST/PATCH/DELETE) except auth public routes
  if (["POST", "PATCH", "PUT", "DELETE"].includes(req.method) && pathname.startsWith("/api/") && !PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    const csrfCookie = req.cookies.get("omm_csrf")?.value;
    const csrfHeader = req.headers.get("x-csrf-token");
    // Only enforce if both present — gradually strict. If cookie exists but header missing, block.
    if (csrfCookie && csrfHeader !== csrfCookie) {
      // Allow if no cookie yet (first request) — set it
      if (csrfCookie) {
        return addSecurityHeaders(NextResponse.json({ error: "CSRF token mismatch" }, { status: 403 }));
      }
    }
  }

  const res = NextResponse.next();
  // Ensure CSRF cookie exists for authenticated GETs
  if (!req.cookies.get("omm_csrf")?.value && req.method === "GET" && !pathname.startsWith("/api/")) {
    const csrf = crypto.randomUUID();
    res.cookies.set("omm_csrf", csrf, { httpOnly: false, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
  }

  // Rate limit hint headers (actual limiting in route handlers via rateLimit())
  res.headers.set("X-RateLimit-Policy", "100 req/min per IP; auth 5 req/min");

  return addSecurityHeaders(res);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
