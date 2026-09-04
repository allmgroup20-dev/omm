import { nanoid } from "nanoid";

export function generateMessCode(): string {
  // OMM-XXXX (4 char base32)
  const raw = nanoid(6).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  return `OMM-${raw}`;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function generateInviteCode(): string {
  return nanoid(8).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
}

export function generateLinkToken(): string {
  return nanoid(24);
}
