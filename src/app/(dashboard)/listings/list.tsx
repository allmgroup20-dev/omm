"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/i18n/provider";
import { formatCurrency } from "@/i18n/dict";

type L = { id: string; slug: string; title: string; district: string | null; area: string | null; pricePaisa: number; status: string; type: string };

export default function MyListings() {
  const { t, locale } = useLocale();
  const [listings, setListings] = useState<L[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/listings?mine=1")
      .then((r) => r.json())
      .then((d) => {
        if (d.listings) setListings(d.listings);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="rounded-2xl border bg-white p-10 text-center text-sm animate-pulse">{t("common.loading")}</div>;
  if (!listings.length)
    return (
      <div className="rounded-2xl border bg-white p-10 text-center">
        <div className="font-medium text-sm">{t("listing.noMine")}</div>
        <div className="text-xs text-zinc-500 mt-1">{t("listing.noMineDesc")}</div>
        <Link href="/listings/new" className="inline-flex items-center mt-3 px-5 py-2.5 rounded-full bg-zinc-900 text-white text-sm min-h-[48px]">{t("listing.createFirst")}</Link>
      </div>
    );

  return (
    <div className="space-y-2">
      {listings.map((l) => (
        <div key={l.id} className="rounded-2xl border bg-white p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="font-medium text-sm truncate">{l.title}</div>
            <div className="text-xs text-zinc-500 mt-1">{[l.district, l.area].filter(Boolean).join(", ")} • <span className="tabular-nums">{formatCurrency(l.pricePaisa, locale)}</span> • <span className="border rounded-full px-2 py-0.5">{t(`listing.st_${l.status}` as never) === `listing.st_${l.status}` ? l.status : t(`listing.st_${l.status}` as never)}</span></div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href={`/listings/${l.slug}`} className="text-xs border rounded-full px-4 py-2.5 min-h-[44px] inline-flex items-center">{t("listing.viewBtn")}</Link>
            <Link href={`/listings/${l.slug}/edit`} className="text-xs border rounded-full px-4 py-2.5 bg-zinc-50 min-h-[44px] inline-flex items-center">{t("listing.editBtn")}</Link>
          </div>
        </div>
      ))}
    </div>
  );
}
