import { nanoid } from "nanoid";

export function generateMessCode(): string {
  let raw = "";
  while (raw.length < 6) {
    raw += nanoid(8).toUpperCase().replace(/[^A-Z0-9]/g, "");
  }
  return `OMM-${raw.slice(0, 6)}`;
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
  // Ensure exactly 8 alphanumeric chars (nanoid may include _-)
  let code = "";
  while (code.length < 8) {
    code += nanoid(12).toUpperCase().replace(/[^A-Z0-9]/g, "");
  }
  return code.slice(0, 8);
}

export function generateLinkToken(): string {
  return nanoid(24);
}
