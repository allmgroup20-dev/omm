import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

// Local seed runner: applies drizzle/seed-geo.sql to the local sqlite DB.
// Usage: DATABASE_URL=./data/omm.db npx tsx src/db/seed-geo.ts
// Prod: wrangler d1 execute omm-db --remote --file=./drizzle/seed-geo.sql --env production
const dbPath = process.env.DATABASE_URL || "./data/omm.db";
const dir = path.dirname(dbPath);
if (dir && dir !== ".") fs.mkdirSync(dir, { recursive: true });
const sql = fs.readFileSync(path.join(process.cwd(), "drizzle", "seed-geo.sql"), "utf8");
const db = new Database(dbPath);
db.pragma("foreign_keys = OFF");
db.exec(sql);
const row = db.prepare("SELECT COUNT(*) AS c FROM locations").get() as { c: number };
console.log(`locations rows: ${row.c}`);
