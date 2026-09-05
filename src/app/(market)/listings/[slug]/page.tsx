import { notFound } from "next/navigation";
import Link from "next/link";
import { getDb } from "@/db";
import { listings, listingImages } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = getDb();
  const rows = await db.select().from(listings).where(eq(listings.slug, slug)).limit(1);
  const l = rows[0];
  if (!l) return { title: "Not found — OMM" };
  return {
    title: `${l.title} — ${l.district || ""} ${l.area || ""} | OMM`,
    description: (l.description || "").slice(0, 160),
    openGraph: {
      title: l.title,
      description: l.description || undefined,
      type: "website",
      images: [],
    },
    alternates: { canonical: `https://omm.jobayergroup.com/listings/${l.slug}` },
  };
}

export default async function ListingDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = getDb();
  const rows = await db.select().from(listings).where(eq(listings.slug, slug)).limit(1);
  const listing = rows[0];
  if (!listing || listing.status !== "published") notFound();
  const images = await db.select().from(listingImages).where(eq(listingImages.listingId, listing.id)).orderBy(listingImages.position);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: listing.title,
    description: listing.description || "",
    url: `https://omm.jobayergroup.com/listings/${listing.slug}`,
    offers: {
      "@type": "Offer",
      price: listing.pricePaisa / 100,
      priceCurrency: listing.currency,
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: listing.area || listing.district || "",
      addressRegion: listing.district || "",
      streetAddress: listing.address || "",
    },
  };

  return (
    <div className="space-y-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href="/s" className="text-sm text-zinc-500">← সার্চে ফিরুন</Link>

      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="grid md:grid-cols-3 gap-2 p-2">
          {images.length ? images.slice(0, 6).map((img) => (
            <div key={img.id} className="h-48 bg-zinc-100 rounded-xl overflow-hidden">
              <img src={img.url} alt={listing.title} className="w-full h-full object-cover" loading="lazy" />
            </div>
          )) : <div className="md:col-span-3 h-48 bg-zinc-100 grid place-items-center text-zinc-400">ছবি নেই</div>}
        </div>
        <div className="p-6">
          <h1 className="text-xl font-bold">{listing.title}</h1>
          <div className="text-sm text-zinc-500 mt-1">{[listing.division, listing.district, listing.upazila, listing.area].filter(Boolean).join(" • ") || listing.address || "লোকেশন"}</div>
          <div className="font-bold text-lg mt-3">৳{(listing.pricePaisa / 100).toLocaleString("bn-BD")} <span className="text-xs font-normal">/মাস</span> {listing.depositPaisa ? <span className="text-xs text-zinc-500">• জামানত ৳{(listing.depositPaisa / 100).toLocaleString("bn-BD")}</span> : null}</div>
          <div className="flex gap-2 mt-3 text-xs">
            <span className="border rounded-full px-3 py-1 bg-zinc-50">{listing.type}</span>
            <span className="border rounded-full px-3 py-1 bg-zinc-50">{listing.genderPreference}</span>
            {listing.furnished ? <span className="border rounded-full px-3 py-1 bg-emerald-50">Furnished</span> : null}
            {listing.verified ? <span className="border rounded-full px-3 py-1 bg-emerald-600 text-white">✓ Verified</span> : null}
          </div>

          <div className="mt-6 grid md:grid-cols-2 gap-4 text-sm">
            <div className="border rounded-xl p-4">
              <div className="font-semibold">মূল তথ্য</div>
              <ul className="mt-2 space-y-1 text-zinc-600">
                <li>বেডরুম: {listing.bedrooms ?? "—"} • বাথরুম: {listing.bathrooms ?? "—"}</li>
                <li>আয়তন: {listing.sqft ? `${listing.sqft} sqft` : "—"} • ফ্লোর: {listing.floor ?? "—"}/{listing.totalFloors ?? "—"}</li>
                <li>সিট: {listing.occupancy ?? "—"}/{listing.totalSeats ?? "—"}</li>
                <li>উপলব্ধ: {listing.availableFrom || "—"}</li>
              </ul>
            </div>
            <div className="border rounded-xl p-4">
              <div className="font-semibold">সুবিধা</div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {["WiFi", "গ্যাস", "বিদ্যুৎ", "পানি", "পার্কিং", "লিফট", "জেনারেটর"].map((f) => (
                  <span key={f} className="border rounded-full px-3 py-1 bg-zinc-50">{f}</span>
                ))}
              </div>
            </div>
          </div>

          {listing.description && (
            <div className="mt-6">
              <div className="font-semibold">বিস্তারিত</div>
              <p className="text-sm text-zinc-600 mt-2 whitespace-pre-wrap">{listing.description}</p>
            </div>
          )}

          <div className="mt-6 border rounded-xl p-4 bg-zinc-50">
            <div className="font-semibold text-sm">যোগাযোগ</div>
            <p className="text-xs text-zinc-500 mt-1">ফোন/WhatsApp আর্কিটেকচার-ready — মালিকের সাথে সরাসরি যোগাযোগ (privacy: masking controlled).</p>
            <form action={`/api/listings/${listing.slug}/inquiry`} method="post" className="mt-3 space-y-2">
              <textarea name="message" placeholder="আপনার বার্তা (কমপক্ষে ১০ অক্ষর)" className="w-full border rounded-xl px-3 py-2 text-sm" rows={3} required />
              <input name="contactPhone" placeholder="ফোন (ঐচ্ছিক)" className="w-full border rounded-xl px-3 py-2 text-sm" />
              <input name="honeypot" className="hidden" tabIndex={-1} autoComplete="off" />
              <button type="submit" className="w-full rounded-full bg-zinc-900 text-white py-2 text-sm">বার্তা পাঠান</button>
            </form>
          </div>

          <div className="mt-6 text-xs text-zinc-500">নিরাপত্তা: লিস্টিং যাচাই, রিপোর্ট, এবং মডারেশন সিস্টেম রয়েছে।</div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4">
        <div className="font-semibold text-sm">অনুরূপ লিস্টিং</div>
        <p className="text-xs text-zinc-500 mt-1">একই এলাকার অন্যান্য সিট — শীঘ্রই আসছে (similar by district/area).</p>
      </div>
    </div>
  );
}
