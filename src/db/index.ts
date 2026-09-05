import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import fs from "node:fs";
import path from "node:path";

// For local dev (better-sqlite3). In production, use D1 via Cloudflare binding.
// D1 client will be created via `drizzle/d1` with env.DB
let _db: ReturnType<typeof drizzle> | null = null;

export function getDb(dbPath = process.env.DATABASE_URL || "./data/omm.db") {
  if (_db) return _db;
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

export type Db = ReturnType<typeof getDb>;
export { schema };
