// Generates drizzle/seed-geo.sql (idempotent INSERT OR IGNORE) from data/bd-geo.json
// Usage: node scripts/build-geo-seed.mjs
// Apply local:  npx tsx src/db/seed-geo.ts
// Apply prod:   wrangler d1 execute omm-db --remote --file=./drizzle/seed-geo.sql --env production
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const geo = JSON.parse(fs.readFileSync(path.join(root, "data", "bd-geo.json"), "utf8"));

const esc = (v) => (v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
const now = new Date().toISOString();
const lines = ["-- BD geo seed (divisions/districts/upazilas). Idempotent via OR IGNORE on slug.", "-- NOTE: no BEGIN/COMMIT — D1 remote execute rejects explicit transactions."]; 

let n = 0;
for (const div of geo.divisions) {
  lines.push(
    `INSERT OR IGNORE INTO locations (id, level, division, district, upazila, bn_name, postal, slug, lat, lng, created_at) VALUES (${esc(`geo-div-${div.slug}`)}, 1, ${esc(div.en)}, ${esc("")}, NULL, ${esc(div.bn)}, NULL, ${esc(`div-${div.slug}`)}, ${esc(div.lat)}, ${esc(div.lng)}, ${esc(now)});`,
  );
  n++;
  for (const dist of div.districts) {
    lines.push(
      `INSERT OR IGNORE INTO locations (id, level, division, district, upazila, bn_name, postal, slug, lat, lng, created_at) VALUES (${esc(`geo-dist-${dist.slug}`)}, 2, ${esc(div.en)}, ${esc(dist.en)}, NULL, ${esc(dist.bn)}, NULL, ${esc(`dist-${dist.slug}`)}, ${esc(dist.lat)}, ${esc(dist.lng)}, ${esc(now)});`,
    );
    n++;
    for (const up of dist.upazilas) {
      lines.push(
        `INSERT OR IGNORE INTO locations (id, level, division, district, upazila, bn_name, postal, slug, lat, lng, created_at) VALUES (${esc(`geo-upa-${dist.slug}-${up.slug}`)}, 3, ${esc(div.en)}, ${esc(dist.en)}, ${esc(up.en)}, ${esc(up.bn)}, ${esc(up.zip[0] || null)}, ${esc(`upa-${dist.slug}-${up.slug}`)}, NULL, NULL, ${esc(now)});`,
      );
      n++;
    }
  }
}
fs.writeFileSync(path.join(root, "drizzle", "seed-geo.sql"), lines.join("\n"));
console.log(`wrote drizzle/seed-geo.sql with ${n} inserts`);
