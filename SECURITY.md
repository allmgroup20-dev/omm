# OMM Security Documentation — Phase 12 Hardening

## Authentication & Session
- Passwords: `bcryptjs` (cost 10), policy 8+ chars + upper/lower/number, Zod + server validation.
- Sessions: `jose` HS256 JWT (7d, `jti`), httpOnly, Secure (prod), SameSite Lax, stored `sessions.tokenHash` for revocation; `logout` deletes session, `logout-all` deletes all.
- Brute-force: `rateLimit 5/min/IP` + `loginHistory` check (5 failures/15 min block), IP + email + userId key, audit `loginHistory`.
- Forgot/Reset: 15m JWT with `purpose:reset`, single-use via session purge.

## Authorization & Tenant Isolation
- Every mess-scoped query filters `messMembers.messId = :id AND userId = currentUser.id`; 403 on mismatch even with URL tampering.
- Roles: `super_admin|manager|assistant_manager|member` + granular `permissionsJson`; middleware checks `hasPermission` (manager all, assistant limited, member read-only).
- `assertTenant(messId)` helper enforces messId presence.

## Input Validation & Financial Integrity
- All inputs Zod-validated frontend + backend + DB constraints; `CHECK(quantity>=0)`, `UNIQUE(mess,member,date,mealType)` prevents duplicates.
- Money: `INTEGER paisa` (BDT*100), meal qty `INTEGER scaled x100`, `qty*price` backend re-calculated, mismatch 400.
- Idempotency: `clientRefId UNIQUE` for deposits/market/expenses; duplicate 409.
- No hard delete on financial history — `status voided/reversed/archived` + `auditLogs` + `mealCorrections`.

## CSRF / XSS / Injection
- CSRF: double-submit `omm_csrf` cookie + `x-csrf-token` header check in middleware for POST/PATCH/DELETE on `/api/*` (public auth excluded).
- XSS: React auto-escaping + `escapeHtml` helper, `sanitizeString` removes control chars, `Content-Security-Policy` header (default-src self) + `X-XSS-Protection`.
- SQL injection: `drizzle-orm` parameterized queries only, no raw SQL.
- File upload (R2 receipts): `ALLOWED_MIME` jpeg/png/webp/gif/pdf, `MAX 5MB`, extension check, architecture-ready (no direct exec).

## Headers & Transport
- `next.config.ts` securityHeaders: `HSTS` (63072000 preload), `X-Frame-Options SAMEORIGIN`, `X-Content-Type-Options nosniff`, `Referrer-Policy strict-origin-when-cross-origin`, `Permissions-Policy`, `CSP`.
- `poweredByHeader: false`, `X-Request-Id` per request, `X-RateLimit-Policy` hint.

## Rate Limiting & Abuse
- `lib/rate-limit.ts` in-memory `Map` (KV-ready for prod): auth 5/min, forgot 3/min, general 100/min; returns 429 with `remaining/resetAt`.
- Brute-force via `lib/brute-force.ts` (loginHistory).

## Audit & Observability
- `auditLogs` for meal/edit, expense, deposit, settlement, member removal, manager change, close/reopen (before/after/reason/ip/ua), immutable (no DELETE endpoint).
- `loginHistory` tracks every attempt (success/ip/ua).

## Secrets & Env
- `AUTH_SECRET >=32 chars` via `wrangler secret put`; never in repo; `.env.example` only placeholders; `DATABASE_URL`, `R2`, `KV` via bindings.

## Deployment (omm.jobayergroup.com)
- HTTPS only, Cloudflare WAF/DDoS, `wrangler.jsonc` bindings `DB/R2/KV`, observability enabled.

## Remaining
- Future: `Turnstile` for public forms, `2FA`, `WebAuthn`, `rate limit via KV`, `Tail Workers` for suspicious log alerts.
