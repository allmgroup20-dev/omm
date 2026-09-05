import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Runtime env reader that works in Node (local/CI/scripts) AND on
 * Cloudflare Workers (vars + secrets live on the request env, not process.env).
 * process.env wins when set; otherwise falls back to the Workers env.
 */
export function getEnv(key: string, fallback = ""): string {
  const v = process.env[key];
  if (v !== undefined && v !== "") return v;
  try {
    const ctx = getCloudflareContext();
    const ev = (ctx.env as Record<string, unknown> | undefined)?.[key];
    if (typeof ev === "string" && ev !== "") return ev;
  } catch {
    // Not in a Workers request context — use fallback
  }
  return fallback;
}
