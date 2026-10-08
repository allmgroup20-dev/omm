import { notFound } from "next/navigation";
import Link from "next/link";
import { getRequestDb } from "@/db";
import { listings, listingImages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getServerDict } from "@/i18n/server";
import { formatCurrency } from "@/i18n/dict";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await getRequestDb();
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
  const { t, locale } = await getServerDict();
  const db = await getRequestDb();
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
      <Link href="/s" className="text-sm text-zinc-500 min-h-[44px] inline-flex items-center">{t("listing.backSearch")}</Link>

      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="grid md:grid-cols-3 gap-2 p-2">
          {images.length ? images.slice(0, 6).map((img) => (
            <div key={img.id} className="h-48 bg-zinc-100 rounded-xl overflow-hidden">
              <img src={img.url} alt={listing.title} className="w-full h-full object-cover" loading="lazy" />
            </div>
          )) : <div className="md:col-span-3 h-48 bg-zinc-100 grid place-items-center text-zinc-400">{t("listing.noPhoto")}</div>}
        </div>
        <div className="p-6">
          <h1 className="text-xl font-bold">{listing.title}</h1>
          <div className="text-xs text-zinc-500 mt-2 flex flex-wrap items-center gap-1">
            <span>{t("geo.country")} <b>{t("geo.countryName")}</b></span>
            {[listing.division, listing.district, listing.upazila, listing.unionName].filter(Boolean).map((p) => (
              <span key={p}>› <b>{p}</b></span>
            ))}
          </div>
          <div className="text-sm text-zinc-600 mt-1">
            {[listing.area, listing.address].filter(Boolean).join(", ") || t("common.noData")}
            {listing.postalCode ? ` — ${listing.postalCode}` : ""}
          </div>
          <div className="font-bold text-lg mt-3 tabular-nums">{formatCurrency(listing.pricePaisa, locale)} <span className="text-xs font-normal">{t("search.perMonth")}</span> {listing.depositPaisa ? <span className="text-xs text-zinc-500">• {t("listing.depositLabel")} {formatCurrency(listing.depositPaisa, locale)}</span> : null}</div>
          <div className="flex gap-2 mt-3 text-xs flex-wrap">
            <span className="border rounded-full px-3 py-1 bg-zinc-50">{t(`types.${listing.type}` as never) === `types.${listing.type}` ? listing.type : t(`types.${listing.type}` as never)}</span>
            <span className="border rounded-full px-3 py-1 bg-zinc-50">{listing.genderPreference === "male" ? t("listing.genderMale") : listing.genderPreference === "female" ? t("listing.genderFemale") : t("listing.genderAny")}</span>
            {listing.furnished ? <span className="border rounded-full px-3 py-1 bg-emerald-50">{t("listing.furnished")}</span> : null}
            {listing.verified ? <span className="border rounded-full px-3 py-1 bg-emerald-600 text-white">✓ {t("listing.verifiedYes")}</span> : null}
          </div>

          <div className="mt-6 grid md:grid-cols-2 gap-4 text-sm">
            <div className="border rounded-xl p-4">
              <div className="font-semibold">{t("listing.keyInfo")}</div>
              <ul className="mt-2 space-y-1 text-zinc-600">
                <li>{t("listing.bedrooms")}: {listing.bedrooms ?? "—"} • {t("listing.bathrooms")}: {listing.bathrooms ?? "—"}</li>
                <li>{t("listing.areaSqft")}: {listing.sqft ? `${listing.sqft} sqft` : "—"} • {t("listing.floorLabel")}: {listing.floor ?? "—"}/{listing.totalFloors ?? "—"}</li>
                <li>{t("listing.seatsLabel")}: {listing.occupancy ?? "—"}/{listing.totalSeats ?? "—"}</li>
                <li>{t("listing.availableLabel")}: {listing.availableFrom || "—"}</li>
              </ul>
            </div>
            <div className="border rounded-xl p-4">
              <div className="font-semibold">{t("listing.details")}</div>
              <p className="text-sm text-zinc-600 mt-2">{listing.description || "—"}</p>
            </div>
          </div>

          <div className="mt-6 border rounded-xl p-4 bg-zinc-50">
            <div className="font-semibold text-sm">{t("listing.contact")}</div>
            <p className="text-xs text-zinc-500 mt-1">{t("listing.contactNote")}</p>
            <form action={`/api/listings/${listing.slug}/inquiry`} method="post" className="mt-3 space-y-2">
              <textarea name="message" placeholder={t("listing.msgPh")} aria-label={t("listing.msgPh")} className="w-full border rounded-xl px-3 py-3 text-base sm:text-sm min-h-[52px]" rows={3} required />
              <input name="contactPhone" placeholder={t("listing.phonePh")} aria-label={t("listing.phonePh")} inputMode="tel" className="w-full border rounded-xl px-3 py-3 text-base sm:text-sm min-h-[52px]" />
              <input name="honeypot" className="hidden" tabIndex={-1} autoComplete="off" />
              <button type="submit" className="w-full rounded-full bg-zinc-900 text-white py-3 text-sm min-h-[52px]">{t("listing.sendMsg")}</button>
            </form>
          </div>

          <div className="mt-6 text-xs text-zinc-500">{t("listing.safety")}</div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4">
        <div className="font-semibold text-sm">{t("listing.similar")}</div>
        <p className="text-xs text-zinc-500 mt-1">{t("listing.similarDesc")}</p>
      </div>
    </div>
  );
}
