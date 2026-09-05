# DEPLOYMENT — omm.jobayergroup.com

Production target: **Cloudflare Workers + D1 + R2 + KV** via **OpenNext** adapter.

## 1. Prereqs
- Cloudflare account with zone `jobayergroup.com` (DNS on Cloudflare, proxied)
- `wrangler` authenticated: `npx wrangler login`
- Node 20+ / npm 10+
- `AUTH_SECRET` ≥32 chars (generate: `openssl rand -base64 32`)

## 2. Create Cloudflare Resources

```bash
# D1 databases per env
npx wrangler d1 create omm-db --env production
npx wrangler d1 create omm-db-staging --env staging
# Note database_id from output → put into wrangler.jsonc d1_databases[].database_id per env

# KV for sessions/rate-limit/cache
npx wrangler kv:namespace create KV --env production
npx wrangler kv:namespace create KV --env staging
# put id into kv_namespaces[].id

# R2 bucket (once, shared or per env)
npx wrangler r2 bucket create omm-receipts
# (optional) staging bucket: omm-receipts-staging
```

Update `wrangler.jsonc`:
```jsonc
"d1_databases": [{ "binding": "DB", "database_name": "omm-db", "database_id": "<PROD_D1_ID>" }],
"kv_namespaces": [{ "binding": "KV", "id": "<PROD_KV_ID>" }],
```

## 3. Secrets — never in repo
```bash
# Production
npx wrangler secret put AUTH_SECRET --env production
# paste 32+ char secret
npx wrangler secret put AUTH_URL --env production # https://omm.jobayergroup.com

# Staging similarly
npx wrangler secret put AUTH_SECRET --env staging
```

Local dev uses `.dev.vars` (copy from `.dev.vars.example`) — not committed.

## 4. Environment Separation
- `development`: `DATABASE_URL=./data/omm.db` (better-sqlite3), `.env.local`
- `staging`: `wrangler.jsonc` env.staging (D1 `omm-db-staging`, `APP_URL` staging-omm...)
- `production`: `wrangler.jsonc` env.production (D1 `omm-db`, `APP_URL` https://omm.jobayergroup.com)

Secrets via `wrangler secret put`, not `vars`.

## 5. DB Migrations

Local:
```bash
npm run db:generate
npm run db:migrate
```

Production (remote D1):
```bash
# Option A: drizzle apply via wrangler execute
npx wrangler d1 execute omm-db --remote --file=./drizzle/0000_last_thunderball.sql --env production

# Option B: use wrangler d1 migrations helper (if configured)
npx wrangler d1 migrations apply omm-db --remote --env production
```

Verify:
```bash
npx wrangler d1 execute omm-db --remote --command="SELECT name FROM sqlite_master WHERE type='table'" --env production
```

## 6. Build & Deploy

```bash
# Production build + deploy (OpenNext generates .open-next/worker.js + assets)
npm run deploy:prod
# or staging
npm run deploy:staging

# Manual steps:
npx @opennextjs/cloudflare build
npx wrangler deploy --env production
```

Check:
```bash
npx wrangler deployments list --env production
curl -I https://omm.jobayergroup.com
```

## 7. DNS & HTTPS
- Cloudflare Dashboard → `jobayergroup.com` → DNS → Add `omm` CNAME/proxied to Workers (wrangler route handles `omm.jobayergroup.com/*`).
- SSL: Cloudflare **Full (strict)** + **HSTS** (already in next.config headers & wrangler).
- Turn on **Auto HTTPS Rewrites**, **Brotli**, **WAF** (managed rules).

## 8. Backup & Recovery
- D1: `npx wrangler d1 backup create omm-db --env production` (daily via Cron Trigger or GitHub Action)
- R2: versioning enabled on `omm-receipts`, lifecycle 30 days.
- Verify restores monthly: `wrangler d1 backup restore --help`.
- Local SQLite `data/omm.db` is gitignored — production source of truth is D1.

## 9. Monitoring & Logs
- `wrangler.jsonc` `observability.enabled: true` + `logs` sampling.
- `npx wrangler tail --env production` for live logs.
- Cloudflare Web Analytics + Workers Analytics for R2/D1 metrics.
- Sentry (optional): add `SENTRY_DSN` via `wrangler secret put` and instrument `src/lib/monitoring.ts`.

## 10. Post-deploy Checklist
- [ ] `https://omm.jobayergroup.com` loads, redirects http→https
- [ ] Register/Login, create mess, invite member, daily meal bulk, market entry, deposit, settlement, close month — all work
- [ ] File upload (receipt) mime/size validation passes
- [ ] Audit logs show close/reopen, corrections
- [ ] Rate limit (5/min login) returns 429 when exceeded
- [ ] Tenant isolation: userA cannot fetch messB via ID tampering (403)
- [ ] Mobile meal entry usable

## 11. Rollback
```bash
npx wrangler deployments list --env production
npx wrangler rollback --deployment-id=<prev> --env production
# or redeploy previous git tag
git checkout <prev-tag> && npm run deploy:prod
```

## 12. Troubleshooting
- `Error: Cannot find module ...` with `&` in path `H:\WEB & Softwer` — use junction `C:\Users\...\Temp\omm-app` for builds, or move repo to path without `&`/` ` (e.g., `C:\omm-app`).
- `SWC native ... not valid Win32` — use `--webpack` builds locally; OpenNext handles prod.
- `no such column: ip` on migrate — squashed migration in `drizzle/0000_last_thunderball.sql`; delete old `data/omm.db` and re-migrate.
