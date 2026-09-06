import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { updateProfileSchema } from "@/lib/validators";
import { getRequestDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sanitizeString } from "@/lib/security";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// GET /api/profile — current user (safe, without passwordHash)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { passwordHash: _ph, ...safe } = user as typeof user & { passwordHash: string };
  return NextResponse.json({ user: safe });
}

// PATCH /api/profile — update full profile (name, email, phone, photo, emergencyContact, notes)
// Login safety: email change checks uniqueness + resets emailVerified; googleSub stays linked
export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = getClientIp(req);
  const rl = rateLimit(`profile:${ip}:${user.id}`, 10, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests. Try later." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });
  }

  const raw = parsed.data;
  const fullName = sanitizeString(raw.fullName, 80);
  if (fullName.length < 2) return NextResponse.json({ error: "নাম কমপক্ষে ২ অক্ষর" }, { status: 400 });

  const email = raw.email.toLowerCase().trim();
  const phone = raw.phone?.trim() ? sanitizeString(raw.phone.trim(), 20) : null;
  const profilePhoto = raw.profilePhoto?.trim() ? sanitizeString(raw.profilePhoto.trim(), 500) : null;
  const emergencyContact = raw.emergencyContact?.trim() ? sanitizeString(raw.emergencyContact.trim(), 200) : null;
  const notes = raw.notes?.trim() ? sanitizeString(raw.notes.trim(), 500) : null;

  // Basic phone sanity: allow digits, +, -, space
  if (phone && !/^[0-9+\-\s()]{8,20}$/.test(phone)) {
    return NextResponse.json({ error: "সঠিক ফোন নম্বর দিন" }, { status: 400 });
  }
  // profilePhoto: allow http(s) URL or empty; empty handled above
  if (profilePhoto && !/^https?:\/\/.+/i.test(profilePhoto)) {
    return NextResponse.json({ error: "ছবির লিংক সঠিক নয় (https://...)" }, { status: 400 });
  }

  const db = await getRequestDb();
  const now = new Date().toISOString();
  const emailChanged = email !== user.email.toLowerCase().trim();

  // Email uniqueness check if changed
  if (emailChanged) {
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing[0] && existing[0].id !== user.id) {
      return NextResponse.json({ error: "ইমেইলটি ইতিমধ্যে ব্যবহৃত" }, { status: 409 });
    }
  }

  try {
    const updates: Record<string, unknown> = {
      fullName,
      email,
      phone,
      profilePhoto,
      emergencyContact,
      notes,
      updatedAt: now,
    };
    if (emailChanged) {
      updates.emailVerified = false;
    }

    await db.update(users).set(updates as never).where(eq(users.id, user.id));

    let rows: (typeof users.$inferSelect)[];
    try {
      rows = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    } catch (e: unknown) {
      const em = e instanceof Error ? e.message : String(e);
      if (em.includes("google_sub") || em.includes("no such column")) {
        // fallback without google_sub column (D1 not yet migrated)
        const raw = (db as unknown as { all?: (sql: string, params: unknown[]) => Record<string, unknown>[] }).all?.(
          "SELECT id, email, phone, phone_verified, password_hash, full_name, profile_photo, email_verified, status, emergency_contact, notes, created_at, updated_at FROM users WHERE id = ? LIMIT 1",
          [user.id],
        );
        if (raw && raw[0]) {
          const r = raw[0];
          rows = [
            {
              id: r.id as string,
              email: r.email as string,
              phone: r.phone as string | null,
              phoneVerified: Boolean(r.phone_verified),
              passwordHash: r.password_hash as string,
              fullName: r.full_name as string,
              profilePhoto: r.profile_photo as string | null,
              emailVerified: Boolean(r.email_verified),
              status: r.status as string,
              emergencyContact: r.emergency_contact as string | null,
              notes: r.notes as string | null,
              googleSub: null,
              createdAt: r.created_at as string,
              updatedAt: r.updated_at as string,
            } as typeof users.$inferSelect,
          ];
        } else rows = [];
      } else throw e;
    }
    const updated = rows[0];
    if (!updated) return NextResponse.json({ error: "User not found after update" }, { status: 500 });
    const { passwordHash: _ph2, ...safe } = updated as typeof updated & { passwordHash: string };

    return NextResponse.json({
      ok: true,
      user: safe,
      emailChanged,
      message: emailChanged
        ? "ইমেইল পরিবর্তন হয়েছে — নতুন ইমেইলে লগইন করতে হবে। Google দিয়ে লগইন করলে স্বয়ংক্রিয়ভাবে যুক্ত থাকবে।"
        : "প্রোফাইল আপডেট হয়েছে",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("UNIQUE") || msg.includes("unique")) {
      return NextResponse.json({ error: "ইমেইলটি ইতিমধ্যে ব্যবহৃত" }, { status: 409 });
    }
    if (msg.includes("google_sub") || msg.includes("no such column")) {
      return NextResponse.json({ error: "Database migration pending. Please try again in a minute." }, { status: 503 });
    }
    return NextResponse.json({ error: "Update failed", detail: msg }, { status: 500 });
  }
}
