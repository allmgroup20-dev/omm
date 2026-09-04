import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import path from "node:path";

const dbPath = process.env.DATABASE_URL || "./data/omm.db";
const drizzleFolder = "./drizzle";

async function run() {
  if (!fs.existsSync(path.dirname(dbPath))) fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  const db = drizzle(sqlite);
  if (!fs.existsSync(drizzleFolder) || fs.readdirSync(drizzleFolder).length === 0) {
    console.log("No drizzle migrations found. Run `npm run db:generate` first.");
    process.exit(0);
  }
  console.log(`Migrating DB at ${dbPath} ...`);
  migrate(db, { migrationsFolder: drizzleFolder });
  console.log("Migration complete.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
