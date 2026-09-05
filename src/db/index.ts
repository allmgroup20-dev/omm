import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as schema from "./schema";

// For local dev / CI / scripts (better-sqlite3) and production (D1 via Cloudflare binding).
// better-sqlite3 is a NATIVE Node module and MUST NOT be statically imported —
// that would break the Cloudflare Workers bundle. It is loaded lazily via
// eval("require") (invisible to bundlers) and only ever executed in Node.
// On Workers, getRequestDb() returns the D1 client and getDb() is never called.
//
// NOTE: Db is typed as the better-sqlite3 drizzle instance. The D1 drizzle
// instance exposes the identical query-builder surface for everything this
// codebase uses (select/insert/update/delete), so the D1 client is cast to Db.
// This keeps ONE type across all 70+ call sites instead of a union that
// breaks drizzle's select() overload inference.

export type Db = BetterSQLite3Database<typeof schema>;

let _db: Db | null = null;
let _d1: Db | null = null;

function loadNodeDeps() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const req = eval("require") as (id: string) => any;
  const fs = req("node:fs") as typeof import("node:fs");
  const path = req("node:path") as typeof import("node:path");
  const { drizzle } = req("drizzle-orm/better-sqlite3") as typeof import("drizzle-orm/better-sqlite3");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Database = req("better-sqlite3") as any;
  return { fs, path, drizzle, Database };
}

/** Node-only: local dev, CI, tests, scripts. NEVER call on Workers. */
export function getDb(dbPath = process.env.DATABASE_URL || "./data/omm.db"): Db {
  if (_db) return _db;
  const { fs, path, drizzle, Database } = loadNodeDeps();
  // Ensure parent directory exists (CI fresh checkout has no data/ since it's gitignored)
  if (dbPath !== ":memory:") {
    const dir = path.dirname(dbPath);
    if (dir && dir !== "." && dir !== "") fs.mkdirSync(dir, { recursive: true });
  }
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  _db = drizzle(sqlite, { schema });
  return _db;
}

/** Wrap a Cloudflare D1 binding. */
export function getD1Db(binding: unknown): Db {
  if (_d1) return _d1;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _d1 = drizzleD1(binding as any, { schema }) as unknown as Db;
  return _d1;
}

/**
 * Request-aware DB: D1 on Cloudflare Workers, better-sqlite3 everywhere else.
 * Use this in ALL route handlers / server components / server lib code.
 */
export async function getRequestDb(): Promise<Db> {
  try {
    const ctx = getCloudflareContext();
    const binding = (ctx.env as Record<string, unknown> | undefined)?.DB;
    if (binding) return getD1Db(binding);
  } catch {
    // Not in a Workers request context (local dev / CI / build) — fall through
  }
  return getDb();
}

export { schema };
