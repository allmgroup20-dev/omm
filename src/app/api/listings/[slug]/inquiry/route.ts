import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getDb } from "@/db";
import { listings, inquiries } from "@/db/schema";
import { inquirySchema } from "@/lib/validators-listing";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { createNotification } from "@/lib/notifications";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = getDb();
  const rows = await db.select().from(listings).where(eq(listings.slug, slug)).limit(1);
  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (rows[0].status !== "published") return NextResponse.json({ error: "Listing not available" }, { status: 409 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = rateLimit(`inquiry:${slug}:${ip}`, 3, 60 * 60 * 1000); // 3 per hour per listing per IP
  if (!rl.allowed) return NextResponse.json({ error: "Too many inquiries. Try later." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = inquirySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });
  if (parsed.data.honeypot) return NextResponse.json({ error: "Spam" }, { status: 400 });

  const user = await getCurrentUser().catch(() => null);

  // Turnstile verify if configured (optional)
  const turnstileToken = (body as Record<string, unknown>)?.turnstileToken as string | undefined;
  const turnstileSecret = process.env.TURNSTILE_SECRET;
  if (turnstileSecret && turnstileToken) {
    try {
      const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: turnstileSecret, response: turnstileToken }),
      });
      const data = (await verifyRes.json()) as { success: boolean };
      if (!data.success) return NextResponse.json({ error: "Verification failed" }, { status: 400 });
    } catch {}
  }

  const now = new Date().toISOString();
  const inquiryId = nanoid();
  await db.insert(inquiries).values({
    id: inquiryId,
    listingId: rows[0].id,
    senderId: user?.id || null,
    message: parsed.data.message.trim(),
    contactPhone: parsed.data.contactPhone?.trim() || null,
    status: "open",
    createdAt: now,
  });

  // Notify owner
  try {
    await createNotification({
      userId: rows[0].ownerId,
      type: "general",
      title: `New inquiry for ${rows[0].title}`,
      body: parsed.data.message.slice(0, 100),
      link: `/listings/${slug}`,
    });
  } catch {}

  return NextResponse.json({ ok: true, inquiryId });
}
