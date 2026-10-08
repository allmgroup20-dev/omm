"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { useLocale } from "@/i18n/provider";
import { formatCurrency, formatNumber } from "@/i18n/dict";

type Listing = { id: string; slug: string; title: string; district: string | null; area: string | null; pricePaisa: number; type: string; genderPreference: string | null; coverImage: { url: string } | null };

function SearchInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const { t, locale } = useLocale();
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    q: sp.get("q") || "",
    division: sp.get("division") || "",
    district: sp.get("district") || "",
    upazila: sp.get("upazila") || "",
    area: sp.get("area") || "",
    type: sp.get("type") || "",
    rentMin: sp.get("rentMin") || "",
    rentMax: sp.get("rentMax") || "",
    sort: sp.get("sort") || "newest",
  });
  const [divisions, setDivisions] = useState<{ en: string; bn: string }[]>([]);
  const [districts, setDistricts] = useState<{ en: string; bn: string }[]>([]);
  const [upazilas, setUpazilas] = useState<{ en: string; bn: string }[]>([]);

  useEffect(() => {
    fetch("/api/geo?level=divisions").then((r) => r.json()).then((d) => { if (d.data) setDivisions(d.data); }).catch(() => {});
  }, []);
  useEffect(() => {
    setDistricts([]);
    if (!filters.division) return;
    fetch(`/api/geo?level=districts&division=${encodeURIComponent(filters.division)}`).then((r) => r.json()).then((d) => { if (d.data) setDistricts(d.data); }).catch(() => {});
  }, [filters.division]);
  useEffect(() => {
    setUpazilas([]);
    if (!filters.district) return;
    fetch(`/api/geo?level=upazilas&district=${encodeURIComponent(filters.district)}`).then((r) => r.json()).then((d) => { if (d.data) setUpazilas(d.data); }).catch(() => {});
  }, [filters.district]);

  async function search() {
    setLoading(true);
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) qs.set(k, v); });
    const res = await fetch(`/api/listings?${qs.toString()}`);
    const data = await res.json();
    if (res.ok) {
      setListings(data.listings);
      setTotal(data.pagination.total);
      // Update URL without reload
      router.replace(`/s?${qs.toString()}`);
    }
    setLoading(false);
  }

  useEffect(() => { search(); }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t("search.title")}</h1>

      <div className="bg-white border rounded-2xl p-3 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} placeholder={t("search.qPh")} aria-label={t("search.qPh")} className="border rounded-full px-4 py-3 text-base sm:text-sm min-h-[44px]" />
          <select value={filters.division} onChange={(e) => setFilters({ ...filters, division: e.target.value, district: "", upazila: "" })} className="border rounded-full px-4 py-3 text-base sm:text-sm min-h-[44px]" aria-label={t("geo.division")}>
            <option value="">{t("search.allDivisions")}</option>
            {divisions.map((d) => (
              <option key={d.en} value={d.en}>{locale === "bn" ? d.bn : d.en}</option>
            ))}
          </select>
          <select value={filters.district} onChange={(e) => setFilters({ ...filters, district: e.target.value, upazila: "" })} className="border rounded-full px-4 py-3 text-base sm:text-sm min-h-[44px]" disabled={!filters.division} aria-label={t("geo.district")}>
            <option value="">{t("search.allDistricts")}</option>
            {districts.map((d) => (
              <option key={d.en} value={d.en}>{locale === "bn" ? d.bn : d.en}</option>
            ))}
          </select>
          <select value={filters.upazila} onChange={(e) => setFilters({ ...filters, upazila: e.target.value })} className="border rounded-full px-4 py-3 text-base sm:text-sm min-h-[44px]" disabled={!filters.district} aria-label={t("geo.upazila")}>
            <option value="">{t("search.allUpazilas")}</option>
            {upazilas.map((d) => (
              <option key={d.en} value={d.en}>{locale === "bn" ? d.bn : d.en}</option>
            ))}
          </select>
          <input value={filters.area} onChange={(e) => setFilters({ ...filters, area: e.target.value })} placeholder={t("search.areaPh")} aria-label={t("search.areaPh")} className="border rounded-full px-4 py-3 text-base sm:text-sm min-h-[44px]" />
          <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} className="border rounded-full px-4 py-3 text-base sm:text-sm min-h-[44px]" aria-label={t("listing.typeLabel")}>
            <option value="">{t("search.allTypes")}</option>
            {(["seat", "bed", "room", "flat", "mess", "hostel"] as const).map((ty) => (
              <option key={ty} value={ty}>{t(`types.${ty}`)}</option>
            ))}
          </select>
          <input value={filters.rentMin} onChange={(e) => setFilters({ ...filters, rentMin: e.target.value })} placeholder={t("search.minRent")} aria-label={t("search.minRent")} type="number" min={0} inputMode="numeric" className="border rounded-full px-4 py-3 text-base sm:text-sm min-h-[44px]" />
          <input value={filters.rentMax} onChange={(e) => setFilters({ ...filters, rentMax: e.target.value })} placeholder={t("search.maxRent")} aria-label={t("search.maxRent")} type="number" min={0} inputMode="numeric" className="border rounded-full px-4 py-3 text-base sm:text-sm min-h-[44px]" />
          <select value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })} className="border rounded-full px-4 py-3 text-base sm:text-sm min-h-[44px]" aria-label={t("common.filter")}>
            <option value="newest">{t("search.sortNew")}</option>
            <option value="price_asc">{t("search.sortLow")}</option>
            <option value="price_desc">{t("search.sortHigh")}</option>
          </select>
          <button onClick={search} className="px-6 py-3 rounded-full bg-zinc-900 text-white text-sm min-h-[44px]">{t("search.searchBtn")}</button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border bg-white p-10 text-center text-sm animate-pulse">{t("search.searching")}</div>
      ) : listings.length === 0 ? (
        <div className="rounded-2xl border bg-white p-10 text-center">
          <div className="font-medium">{t("search.noResults")}</div>
          <div className="text-sm text-zinc-500 mt-1">{t("search.noResultsDesc")}</div>
        </div>
      ) : (
        <>
          <div className="text-sm text-zinc-600">{formatNumber(total, locale)} {t("search.found")}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((l) => (
              <Link key={l.id} href={`/listings/${l.slug}`} className="rounded-2xl border bg-white overflow-hidden hover:shadow-sm transition flex flex-col">
                <div className="aspect-[16/10] bg-zinc-100 grid place-items-center text-zinc-400 text-xs overflow-hidden">
                  {l.coverImage ? <img src={l.coverImage.url} alt={l.title} className="w-full h-full object-cover" loading="lazy" /> : t("listing.noPhoto")}
                </div>
                <div className="p-4">
                  <div className="font-semibold text-sm line-clamp-1">{l.title}</div>
                  <div className="text-xs text-zinc-500 mt-1">{[l.district, l.area].filter(Boolean).join(", ") || t("common.noData")} • {t(`types.${l.type}` as never) === `types.${l.type}` ? l.type : t(`types.${l.type}` as never)} • {l.genderPreference === "male" ? t("listing.genderMale") : l.genderPreference === "female" ? t("listing.genderFemale") : t("listing.genderAny")}</div>
                  <div className="font-bold mt-2 tabular-nums">{formatCurrency(l.pricePaisa, locale)} <span className="text-xs font-normal text-zinc-500">{t("search.perMonth")}</span></div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SearchFallback() {
  const { t } = useLocale();
  return <div className="p-6 text-sm text-zinc-500 animate-pulse">{t("search.searching")}</div>;
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchInner />
    </Suspense>
  );
}
