import { NextResponse } from "next/server";
import { changePasswordSchema } from "@/lib/validators";
import { getCurrentUser } from "@/lib/session";
import { hashPassword, verifyPassword, validatePasswordPolicy } from "@/lib/auth";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });

  const { currentPassword, newPassword } = parsed.data;
  const policy = validatePasswordPolicy(newPassword);
  if (policy) return NextResponse.json({ error: policy }, { status: 400 });

  const db = getDb();
  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "বর্তমান পাসওয়ার্ড ভুল" }, { status: 400 });

  const hash = await hashPassword(newPassword);
  await db.update(users).set({ passwordHash: hash, updatedAt: new Date().toISOString() }).where(eq(users.id, user.id));
  return NextResponse.json({ ok: true });
}
