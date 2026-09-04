import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  // Local dev uses better-sqlite3 file; production uses D1 via wrangler
  dbCredentials: {
    url: process.env.DATABASE_URL || "./data/omm.db",
  },
  verbose: true,
  strict: true,
});
