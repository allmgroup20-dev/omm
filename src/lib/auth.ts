import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { nanoid } from "nanoid";
import { getEnv } from "./env";

const JWT_ALG = "HS256";
const COOKIE_NAME = "omm_session";

export function getCookieName(): string {
  return COOKIE_NAME;
}

function getSecret(): Uint8Array {
  const s = getEnv("AUTH_SECRET");
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be >=32 chars");
  return new TextEncoder().encode(s);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function validatePasswordPolicy(password: string): string | null {
  if (password.length < 8) return "পাসওয়ার্ড কমপক্ষে ৮ অক্ষর হতে হবে";
  if (!/[A-Z]/.test(password)) return "একটি বড় হাতের অক্ষর থাকতে হবে";
  if (!/[a-z]/.test(password)) return "একটি ছোট হাতের অক্ষর থাকতে হবে";
  if (!/[0-9]/.test(password)) return "একটি সংখ্যা থাকতে হবে";
  return null;
}

export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId, jti: nanoid() })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<{ userId: string; jti?: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub) return null;
    return { userId: payload.sub as string, jti: payload.jti as string | undefined };
  } catch {
    return null;
  }
}

export function sessionCookie(token: string): string {
  // 7 days, httpOnly, secure in prod, sameSite Lax
  const secure = getEnv("NODE_ENV") === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}${secure}`;
}

export function clearSessionCookie(): string {
  const secure = getEnv("NODE_ENV") === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function hashToken(token: string): string {
  // simple hash for DB lookup (sha256 stub — use bcrypt for session but jti enough)
  // we store tokenHash via SHA-like; for now use first 32 chars
  let h = 0;
  for (let i = 0; i < token.length; i++) h = (h * 31 + token.charCodeAt(i)) >>> 0;
  return String(h) + token.slice(0, 16);
}
