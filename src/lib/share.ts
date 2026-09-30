/**
 * Dashboard share helpers (pure — safe to unit test).
 */

export type ShareTokenRow = {
  token: string;
  expiresAt?: string | null;
  createdAt?: string;
};

/** True if the token row is still usable at `nowIso`. Missing expiry = treated as valid (legacy rows). */
export function isShareTokenValid(row: ShareTokenRow, nowIso: string = new Date().toISOString()): boolean {
  if (!row.token) return false;
  if (!row.expiresAt) return true;
  return row.expiresAt > nowIso;
}

/**
 * Reuse the newest still-valid token so every click doesn't mint a new link.
 * Returns null when a fresh token must be created via POST.
 */
export function pickValidShareToken(rows: ShareTokenRow[], nowIso: string = new Date().toISOString()): string | null {
  const valid = rows.filter((r) => isShareTokenValid(r, nowIso));
  if (!valid.length) return null;
  valid.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return valid[0].token;
}

/** Absolute public share URL for a token. */
export function shareUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, "")}/share/${token}`;
}
