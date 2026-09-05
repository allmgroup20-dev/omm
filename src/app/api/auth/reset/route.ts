import { NextResponse } from "next/server";
import { resetSchema } from "@/lib/validators";
import { getRequestDb } from "@/db";
import { users, sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { jwtVerify } from "jose";
import { hashPassword, validatePasswordPolicy } from "@/lib/auth";
import { getEnv } from "@/lib/env";

function getSecret(): Uint8Array {
  const s = getEnv("AUTH_SECRET");
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be >=32 chars");
  return new TextEncoder().encode(s);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = resetSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });

  const { token, newPassword } = parsed.data;
  const policy = validatePasswordPolicy(newPassword);
  if (policy) return NextResponse.json({ error: policy }, { status: 400 });

  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.purpose !== "reset" || !payload.sub) throw new Error("invalid");
    const userId = payload.sub as string;
    const db = await getRequestDb();
    const hash = await hashPassword(newPassword);
    await db.update(users).set({ passwordHash: hash, updatedAt: new Date().toISOString() }).where(eq(users.id, userId));
    // logout all devices
    await db.delete(sessions).where(eq(sessions.userId, userId));
    return NextResponse.json({ ok: true, message: "পাসওয়ার্ড রিসেট হয়েছে" });
  } catch {
    return NextResponse.json({ error: "Token invalid or expired" }, { status: 400 });
  }
}
