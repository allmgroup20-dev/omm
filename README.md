# OMM — Our Mess Management (omm.jobayergroup.com)

Production-grade multi-mess SaaS: Meal + Market + Expense + Deposit + Ledger + Settlement + Reports.

## Stack
- Next.js 16 App Router + Tailwind v4 + TypeScript
- Drizzle ORM + SQLite (local `better-sqlite3`) / D1 (Cloudflare prod)
- Hono + Zod for API validation
- Auth: bcryptjs + jose (JWT httpOnly cookies)
- R2 (receipts), KV (sessions/rate-limit), Workflows (future)
- Wrangler for deploy to `omm.jobayergroup.com`

## Quick Start
```bash
npm install
cp .env.example .env.local  # edit AUTH_SECRET
npm run db:generate        # generate drizzle migration
npm run db:migrate         # apply to data/omm.db
npm run dev                # http://localhost:3000
```

## Scripts
- `npm run dev` — Next dev
- `npm run build` — production build
- `npm run lint` — eslint
- `npm run typecheck` — tsc --noEmit
- `npm run db:generate` / `db:migrate` / `db:push`

## Env Separation
- Development: `DATABASE_URL=./data/omm.db`
- Production: D1 binding `DB` via `wrangler.jsonc` + `wrangler secret put AUTH_SECRET`

## Deploy (Phase 1)
```bash
npx wrangler d1 create omm-db
# update wrangler.jsonc database_id
npx wrangler deploy  # via OpenNext adapter (wrangler.jsonc main/.open-next)
```

## Project Structure
```
src/
  app/          # App Router — (auth), (dashboard), landing
  components/ui # reusable UI
  db/           # drizzle schema + client + migrate
  lib/          # money, calendar, auth, utils
data/           # local sqlite (gitignored)
drizzle/        # migrations
```

## Phase 1 Status
- [x] Architecture scaffold
- [x] Wrangler + Drizzle + money/calendar libs
- [ ] Full schema (Phase 2)
- [ ] Auth flows (Phase 3)

See MASTER PROMPT phases 1-16.
