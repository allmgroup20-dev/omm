"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

type Listing = { id: string; slug: string; title: string; district: string | null; area: string | null; pricePaisa: number; type: string; genderPreference: string | null; coverImage: { url: string } | null };

function SearchInner() {
  const sp = useSearchParams();
  const router = useRouter();
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
      <h1 className="text-xl font-bold">সিট / রুম / ফ্ল্যাট খুঁজুন</h1>

      <div className="bg-white border rounded-2xl p-3 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} placeholder="খুঁজুন (যেমন: মিরপুর, ২ সিট)" className="border rounded-full px-4 py-3 text-base sm:text-sm min-h-[44px]" />
          <select value={filters.division} onChange={(e) => setFilters({ ...filters, division: e.target.value, district: "", upazila: "" })} className="border rounded-full px-4 py-3 text-base sm:text-sm min-h-[44px]">
            <option value="">সব বিভাগ</option>
            {divisions.map((d) => (
              <option key={d.en} value={d.en}>{d.bn}</option>
            ))}
          </select>
          <select value={filters.district} onChange={(e) => setFilters({ ...filters, district: e.target.value, upazila: "" })} className="border rounded-full px-4 py-3 text-base sm:text-sm min-h-[44px]" disabled={!filters.division}>
            <option value="">সব জেলা</option>
            {districts.map((d) => (
              <option key={d.en} value={d.en}>{d.bn}</option>
            ))}
          </select>
          <select value={filters.upazila} onChange={(e) => setFilters({ ...filters, upazila: e.target.value })} className="border rounded-full px-4 py-3 text-base sm:text-sm min-h-[44px]" disabled={!filters.district}>
            <option value="">সব উপজেলা</option>
            {upazilas.map((d) => (
              <option key={d.en} value={d.en}>{d.bn}</option>
            ))}
          </select>
          <input value={filters.area} onChange={(e) => setFilters({ ...filters, area: e.target.value })} placeholder="এলাকা (মিরপুর, ধানমন্ডি)" className="border rounded-full px-4 py-3 text-base sm:text-sm min-h-[44px]" />
          <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} className="border rounded-full px-4 py-3 text-base sm:text-sm min-h-[44px]">
            <option value="">সব টাইপ</option>
            <option value="seat">সিট</option>
            <option value="bed">বেড</option>
            <option value="room">রুম</option>
            <option value="flat">ফ্ল্যাট</option>
            <option value="mess">মেস</option>
            <option value="hostel">হোস্টেল</option>
          </select>
          <input value={filters.rentMin} onChange={(e) => setFilters({ ...filters, rentMin: e.target.value })} placeholder="Min ৳" type="number" className="border rounded-full px-4 py-3 text-base sm:text-sm min-h-[44px]" />
          <input value={filters.rentMax} onChange={(e) => setFilters({ ...filters, rentMax: e.target.value })} placeholder="Max ৳" type="number" className="border rounded-full px-4 py-3 text-base sm:text-sm min-h-[44px]" />
          <select value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })} className="border rounded-full px-4 py-3 text-base sm:text-sm min-h-[44px]">
            <option value="newest">নতুন</option>
            <option value="price_asc">কম ভাড়া</option>
            <option value="price_desc">বেশি ভাড়া</option>
          </select>
          <button onClick={search} className="px-6 py-3 rounded-full bg-zinc-900 text-white text-sm min-h-[44px]">খুঁজুন</button>
        </div>
        <p className="text-xs text-zinc-500 mt-2">Debounced server-side search, 20/page, cached 60s. Try: ঢাকা + সিট + 2000-5000</p>
      </div>

      {loading ? (
        <div className="rounded-2xl border bg-white p-10 text-center text-sm animate-pulse">খুঁজছে...</div>
      ) : listings.length === 0 ? (
        <div className="rounded-2xl border bg-white p-10 text-center">
          <div className="font-medium">কোনো লিস্টিং পাওয়া যায়নি</div>
          <div className="text-sm text-zinc-500 mt-1">ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন।</div>
        </div>
      ) : (
        <>
          <div className="text-sm text-zinc-600">{total} টি লিস্টিং পাওয়া গেছে</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((l) => (
              <Link key={l.id} href={`/listings/${l.slug}`} className="rounded-2xl border bg-white overflow-hidden hover:shadow-sm transition flex flex-col">
                <div className="aspect-[16/10] bg-zinc-100 grid place-items-center text-zinc-400 text-xs overflow-hidden">
                  {l.coverImage ? <img src={l.coverImage.url} alt={l.title} className="w-full h-full object-cover" loading="lazy" /> : "ছবি নেই"}
                </div>
                <div className="p-4">
                  <div className="font-semibold text-sm line-clamp-1">{l.title}</div>
                  <div className="text-xs text-zinc-500 mt-1">{[l.district, l.area].filter(Boolean).join(", ") || "লোকেশন"} • {l.type} • {l.genderPreference || "any"}</div>
                  <div className="font-bold mt-2">৳{(l.pricePaisa / 100).toLocaleString("bn-BD")} <span className="text-xs font-normal text-zinc-500">/মাস</span></div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-6">লোড...</div>}>
      <SearchInner />
    </Suspense>
  );
}
