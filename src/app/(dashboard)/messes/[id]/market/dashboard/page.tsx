"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/i18n/provider";
import { formatCurrency, formatNumber } from "@/i18n/dict";

type Dash = { today: { totalPaisa: number; count: number }; week: { totalPaisa: number }; month: { totalPaisa: number }; avgDailyPaisa: number; highestCategory: [string, number] | null; productSpend: [string, number][]; totalEntries: number };

export default function MarketDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useLocale();
  const [data, setData] = useState<Dash | null>(null);

  useEffect(() => {
    fetch(`/api/messes/${id}/market/dashboard`).then((r) => r.json()).then((d) => { if (!d.error) setData(d); });
  }, [id]);

  if (!data) return <div className="p-6 text-sm">{t("common.loading")}</div>;

  return (
    <div className="space-y-4">
      <Link href={`/messes/${id}/market`} className="text-sm text-zinc-500">← {t("market.hub")}</Link>
      <h1 className="text-lg font-bold">{t("market.dashboard")}</h1>
      <div className="grid md:grid-cols-4 gap-3">
        <div className="rounded-2xl border bg-white p-4"><div className="text-xs text-zinc-500">{t("market.today")}</div><div className="font-bold">{formatCurrency(data.today.totalPaisa, locale)}</div><div className="text-xs text-zinc-500">{formatNumber(data.today.count, locale)} {t("market.entriesWord")}</div></div>
        <div className="rounded-2xl border bg-white p-4"><div className="text-xs text-zinc-500">{t("market.thisWeek")}</div><div className="font-bold">{formatCurrency(data.week.totalPaisa, locale)}</div></div>
        <div className="rounded-2xl border bg-white p-4"><div className="text-xs text-zinc-500">{t("market.thisMonth")}</div><div className="font-bold">{formatCurrency(data.month.totalPaisa, locale)}</div></div>
        <div className="rounded-2xl border bg-white p-4"><div className="text-xs text-zinc-500">{t("market.avgDaily")}</div><div className="font-bold">{formatCurrency(data.avgDailyPaisa, locale)}</div></div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="rounded-2xl border bg-white p-5">
          <div className="font-semibold text-sm">{t("market.highestCat")}</div>
          <div className="mt-2 text-sm">{data.highestCategory ? `${data.highestCategory[0]} — ${formatCurrency(data.highestCategory[1], locale)}` : "—"}</div>
          <div className="text-xs text-zinc-500 mt-1">{t("common.total")} {formatNumber(data.totalEntries, locale)} {t("market.purchasesWord")}</div>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <div className="font-semibold text-sm">{t("market.topProducts")}</div>
          <ul className="mt-2 text-sm space-y-1">
            {data.productSpend.map(([name, paisa]) => (
              <li key={name} className="flex justify-between"><span>{name}</span><span>{formatCurrency(paisa, locale)}</span></li>
            ))}
            {data.productSpend.length === 0 && <li className="text-zinc-500">{t("market.noData")}</li>}
          </ul>
        </div>
      </div>
      <Link href={`/messes/${id}/market/add`} className="inline-block px-5 py-2 rounded-full bg-zinc-900 text-white text-sm">{t("market.newMarket")}</Link>
    </div>
  );
}
