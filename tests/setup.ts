import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import path from "node:path";

const dbPath = process.env.DATABASE_URL || "./data/omm.db";

// Ensure directory exists
const dir = path.dirname(dbPath);
if (dir && dir !== "." && dir !== "") fs.mkdirSync(dir, { recursive: true });

// Use a fresh Database connection for migration (avoid singleton caching)
const sqlite = new Database(dbPath);
sqlite.pragma("foreign_keys = OFF");
const db = drizzle(sqlite);
migrate(db, { migrationsFolder: "./drizzle" });
sqlite.close();
