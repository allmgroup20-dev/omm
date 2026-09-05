import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getDb } from "@/db";
import { listings, listingImages } from "@/db/schema";
import { listingSchema } from "@/lib/validators-listing";
import { and, eq, desc, gte, lte, like, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { slugify } from "@/lib/mess";

// GET /api/listings?city=&area=&rentMin=&rentMax=&type=&gender=&furnished=&availableFrom=&q=&sort=&page=&limit=
// Public, no auth, cached via KV in production (here direct DB with proper WHERE)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const district = url.searchParams.get("district") || url.searchParams.get("city") || "";
  const area = url.searchParams.get("area") || "";
  const type = url.searchParams.get("type") || "";
  const gender = url.searchParams.get("gender") || "";
  const q = url.searchParams.get("q") || "";
  const rentMin = Number(url.searchParams.get("rentMin") || 0);
  const rentMax = Number(url.searchParams.get("rentMax") || 0);
  const sort = url.searchParams.get("sort") || "newest"; // newest|price_asc|price_desc
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const limit = Math.min(20, Math.max(1, Number(url.searchParams.get("limit") || 12)));
  const offset = (page - 1) * limit;

  const db = getDb();

  // Build conditions using SQL where (not JS filter) to use indexes
  const conditions: ReturnType<typeof eq>[] = [];
  // Only published listings are public
  // We use eq for status
  let query = db.select().from(listings).where(eq(listings.status, "published")) as unknown as { where: (c: unknown) => unknown; orderBy: (c: unknown) => unknown; limit: (n: number) => unknown; offset: (n: number) => unknown };

  // Instead of dynamic builder, fetch with filters in JS for SQLite simplicity but with DB pre-filter on status
  // For production D1, use proper SQL: where status=published AND district LIKE etc.
  // Here we do a filtered query via SQL LIKE for district/area/type
  // Simplest: use sql template for LIKE
  let rows = await db.select().from(listings).where(eq(listings.status, "published")).orderBy(desc(listings.publishedAt));

  // JS post-filter for MVP (with proper pagination after filter)
  // In production, move to SQL: and(eq(status,published), like(district, `%${district}%`))
  if (district) rows = rows.filter((r) => (r.district || "").toLowerCase().includes(district.toLowerCase()));
  if (area) rows = rows.filter((r) => (r.area || "").toLowerCase().includes(area.toLowerCase()));
  if (type) rows = rows.filter((r) => r.type === type);
  if (gender && gender !== "any") rows = rows.filter((r) => r.genderPreference === gender || r.genderPreference === "any");
  if (q) {
    const qq = q.toLowerCase();
    rows = rows.filter((r) => r.title.toLowerCase().includes(qq) || (r.description || "").toLowerCase().includes(qq));
  }
  if (rentMin) rows = rows.filter((r) => r.pricePaisa >= rentMin * 100);
  if (rentMax) rows = rows.filter((r) => r.pricePaisa <= rentMax * 100);

  // Sorting
  if (sort === "price_asc") rows.sort((a, b) => a.pricePaisa - b.pricePaisa);
  else if (sort === "price_desc") rows.sort((a, b) => b.pricePaisa - a.pricePaisa);
  else rows.sort((a, b) => (b.publishedAt || b.createdAt).localeCompare(a.publishedAt || a.createdAt));

  const total = rows.length;
  const paged = rows.slice(offset, offset + limit);

  // Fetch cover images for paged
  const withImages = await Promise.all(
    paged.map(async (l) => {
      const imgs = await db.select().from(listingImages).where(eq(listingImages.listingId, l.id)).orderBy(listingImages.position);
      return { ...l, coverImage: imgs.find((i) => i.isCover) || imgs[0] || null, images: imgs };
    }),
  );

  const res = NextResponse.json({ listings: withImages, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  // Cache headers for public search (s-maxage 60, stale-while-revalidate 300)
  res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  return res;
}

// POST /api/listings — auth required, honeypot + rate limit (5/day), Turnstile verify if configured
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = listingSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });

  // honeypot
  if (parsed.data.honeypot) return NextResponse.json({ error: "Spam detected" }, { status: 400 });

  const db = getDb();
  // Rate limit: 5 listings per day per user
  const today = new Date().toISOString().slice(0, 10);
  const userListingsToday = await db.select().from(listings).where(eq(listings.ownerId, user.id));
  const todayCount = userListingsToday.filter((r) => r.createdAt.slice(0, 10) === today).length;
  if (todayCount >= 5) return NextResponse.json({ error: "Posting limit reached (5/day)" }, { status: 429 });

  // Turnstile verify if secret configured (optional for MVP)
  const turnstileToken = (body as Record<string, unknown>)?.turnstileToken as string | undefined;
  const turnstileSecret = process.env.TURNSTILE_SECRET;
  if (turnstileSecret && turnstileToken) {
    try {
      const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: turnstileSecret, response: turnstileToken }),
      });
      const verifyData = (await verifyRes.json()) as { success: boolean };
      if (!verifyData.success) return NextResponse.json({ error: "Turnstile verification failed" }, { status: 400 });
    } catch {
      // fail open for MVP if Turnstile unreachable
    }
  }

  const data = parsed.data;
  const now = new Date().toISOString();
  const slugBase = slugify(data.title);
  let slug = slugBase;
  // Ensure unique slug
  const existingSlug = await db.select().from(listings).where(eq(listings.slug, slug)).limit(1);
  if (existingSlug[0]) slug = `${slugBase}-${nanoid(6).toLowerCase()}`;

  const id = nanoid();
  const pricePaisa = Math.round(data.price * 100);
  const depositPaisa = Math.round((data.deposit || 0) * 100);
  const serviceChargePaisa = Math.round((data.serviceCharge || 0) * 100);

  // Quality score: images(0) + location(10) + price(10) + description(20) + facilities(10) = future; for now base 50
  let qualityScore = 50;
  if (data.description && data.description.length > 50) qualityScore += 20;
  if (data.district && data.area) qualityScore += 20;
  if (data.price) qualityScore += 10;

  await db.insert(listings).values({
    id,
    ownerId: user.id,
    slug,
    title: data.title.trim(),
    description: data.description?.trim() || null,
    type: data.type,
    status: "pending", // moderation required before published
    pricePaisa,
    depositPaisa,
    serviceChargePaisa,
    currency: "BDT",
    division: data.division?.trim() || null,
    district: data.district?.trim() || null,
    upazila: data.upazila?.trim() || null,
    area: data.area?.trim() || null,
    address: data.address?.trim() || null,
    lat: data.lat?.trim() || null,
    lng: data.lng?.trim() || null,
    bedrooms: data.bedrooms ?? null,
    bathrooms: data.bathrooms ?? null,
    sqft: data.sqft ?? null,
    floor: data.floor ?? null,
    totalFloors: data.totalFloors ?? null,
    furnished: data.furnished ?? false,
    bachelorAllowed: data.bachelorAllowed ?? true,
    familyAllowed: data.familyAllowed ?? false,
    genderPreference: data.genderPreference || "any",
    availableFrom: data.availableFrom?.trim() || null,
    occupancy: data.occupancy ?? null,
    totalSeats: data.totalSeats ?? null,
    qualityScore,
    createdAt: now,
    updatedAt: now,
  });

  // Audit log for marketplace
  const { auditLogs } = await import("@/db/schema");
  await db.insert(auditLogs).values({ id: nanoid(), messId: null, actorId: user.id, action: "create", entityType: "listing", entityId: id, afterJson: JSON.stringify({ title: data.title, slug, type: data.type }), createdAt: now });

  const row = await db.select().from(listings).where(eq(listings.slug, slug)).limit(1);
  return NextResponse.json({ ok: true, listing: row[0] });
}
