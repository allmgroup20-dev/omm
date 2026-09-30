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

/** 1px transparent PNG — used as imagePlaceholder so failed external images never break rendering. */
export const TRANSPARENT_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

/**
 * Convert a data: URL to Blob WITHOUT fetch() — fetch(dataUrl) throws
 * "Failed to fetch" on large payloads (full-page 2x screenshots on Android).
 * Chunked decoding keeps big base64 strings memory-safe.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) throw new Error("Invalid image data");
  const header = dataUrl.slice(0, comma);
  const data = dataUrl.slice(comma + 1);
  const mimeMatch = /^data:([^;]+);base64$/i.exec(header);
  if (!mimeMatch) throw new Error("Invalid image data");
  const binary = atob(data);
  const chunk = 8192;
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += chunk) {
    const end = Math.min(i + chunk, binary.length);
    for (let j = i; j < end; j++) bytes[j] = binary.charCodeAt(j);
  }
  return new Blob([bytes.buffer as ArrayBuffer], { type: mimeMatch[1] });
}
