import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getDb } from "@/db";
import { listings, listingImages, inquiries, favorites, moderationLogs } from "@/db/schema";
import { listingSchema } from "@/lib/validators-listing";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { slugify } from "@/lib/mess";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = getDb();
  const rows = await db.select().from(listings).where(eq(listings.slug, slug)).limit(1);
  const listing = rows[0];
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Public can only see published, owner or admin can see own draft/pending
  if (listing.status !== "published") {
    // Check if requester is owner (if auth)
    const { getCurrentUser: getUser } = await import("@/lib/session");
    const user = await getUser().catch(() => null);
    if (!user || user.id !== listing.ownerId) {
      // For pending, return limited preview
      return NextResponse.json({ error: "Not published", status: listing.status }, { status: 404 });
    }
  }
  const images = await db.select().from(listingImages).where(eq(listingImages.listingId, listing.id)).orderBy(listingImages.position);
  // Increment view count future (not yet)
  return NextResponse.json({ listing, images });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const rows = await db.select().from(listings).where(eq(listings.slug, slug)).limit(1);
  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (rows[0].ownerId !== user.id) {
    // Check super_admin
    const { messMembers } = await import("@/db/schema");
    // For MVP, only owner can edit; admin check future
    return NextResponse.json({ error: "Forbidden — not owner" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = listingSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });
  if (parsed.data.honeypot) return NextResponse.json({ error: "Spam" }, { status: 400 });

  const data = parsed.data;
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (data.title !== undefined) {
    updates.title = data.title.trim();
    // Do not auto-change slug on edit to keep URL stable; owner can request slug change via admin
  }
  if (data.description !== undefined) updates.description = data.description?.trim() || null;
  if (data.price !== undefined) updates.pricePaisa = Math.round(data.price * 100);
  if (data.district !== undefined) updates.district = data.district?.trim() || null;
  if (data.area !== undefined) updates.area = data.area?.trim() || null;
  if (data.type !== undefined) updates.type = data.type;

  // Any edit after published goes back to pending for re-moderation
  if (rows[0].status === "published") updates.status = "pending";

  await db.update(listings).set(updates as never).where(eq(listings.id, rows[0].id));
  const { auditLogs } = await import("@/db/schema");
  await db.insert(auditLogs).values({ id: nanoid(), actorId: user.id, action: "update", entityType: "listing", entityId: rows[0].id, beforeJson: JSON.stringify(rows[0]), afterJson: JSON.stringify(updates), createdAt: new Date().toISOString() });

  const after = await db.select().from(listings).where(eq(listings.id, rows[0].id)).limit(1);
  return NextResponse.json({ ok: true, listing: after[0] });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const rows = await db.select().from(listings).where(eq(listings.slug, slug)).limit(1);
  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (rows[0].ownerId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Soft archive, not hard delete (preserve inquiries)
  await db.update(listings).set({ status: "archived", updatedAt: new Date().toISOString() }).where(eq(listings.id, rows[0].id));
  return NextResponse.json({ ok: true });
}
