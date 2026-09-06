import Link from "next/link";
import { getServerDict } from "@/i18n/server";

export default async function MarketHubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t } = await getServerDict();
  return (
    <div className="space-y-4">
      <Link href={`/messes/${id}`} className="text-sm text-zinc-500">← {t("nav.overview")}</Link>
      <h1 className="text-lg font-bold">{t("market.hub")}</h1>
      <div className="grid md:grid-cols-3 gap-3">
        <Link href={`/messes/${id}/market/dashboard`} className="rounded-2xl border bg-white p-5 hover:shadow-sm">
          <div className="font-semibold">📊 {t("market.dashboard")}</div><div className="text-xs text-zinc-500 mt-1">{t("market.dashCardD")}</div>
        </Link>
        <Link href={`/messes/${id}/market/entries`} className="rounded-2xl border bg-white p-5 hover:shadow-sm">
          <div className="font-semibold">📋 এন্ট্রি লিস্ট</div><div className="text-xs text-zinc-500 mt-1">কতটুকু/কোথায় — প্রতি এন্ট্রি মোট/আইটেম, Edit/Void</div>
        </Link>
        <Link href={`/messes/${id}/market/add`} className="rounded-2xl border bg-zinc-900 text-white p-5">
          <div className="font-semibold">+ {t("market.addEntry")}</div><div className="text-xs text-white/70 mt-1">{t("market.addCardD")}</div>
        </Link>
        <Link href={`/messes/${id}/market/categories`} className="rounded-2xl border bg-white p-5 hover:shadow-sm">
          <div className="font-semibold">{t("market.categories")}</div><div className="text-xs text-zinc-500 mt-1">{t("market.catCardD")}</div>
        </Link>
        <Link href={`/messes/${id}/market/products`} className="rounded-2xl border bg-white p-5 hover:shadow-sm">
          <div className="font-semibold">{t("market.products")}</div><div className="text-xs text-zinc-500 mt-1">{t("market.prodCardD")}</div>
        </Link>
        <Link href={`/messes/${id}/market/vendors`} className="rounded-2xl border bg-white p-5 hover:shadow-sm">
          <div className="font-semibold">{t("market.vendors")}</div><div className="text-xs text-zinc-500 mt-1">{t("market.vendorCardD")}</div>
        </Link>
      </div>
      <div className="rounded-2xl border bg-white p-4 text-sm text-zinc-600">{t("market.stockNote")}</div>
    </div>
  );
}
