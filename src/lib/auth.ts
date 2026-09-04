import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { nanoid } from "nanoid";

const JWT_ALG = "HS256";

function getSecret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
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
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Password must contain uppercase";
  if (!/[a-z]/.test(password)) return "Password must contain lowercase";
  if (!/[0-9]/.test(password)) return "Password must contain number";
  return null;
}

export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId, jti: nanoid() })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub) return null;
    return { userId: payload.sub as string };
  } catch {
    return null;
  }
}
