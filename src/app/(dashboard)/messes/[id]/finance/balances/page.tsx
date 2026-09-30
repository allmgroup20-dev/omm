"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/i18n/provider";
import { formatCurrency, formatNumber } from "@/i18n/dict";

type Bal = { memberId: string; userId: string; totalMeals: number; mealCostPaisa: number; depositPaisa: number; balancePaisa: number; status: string };

export default function BalancesPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useLocale();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<{ mealRateBDT: number; breakdown: string; members: (Bal & { name?: string })[] } | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(`/api/messes/${id}/members`).then((r) => r.json()).then((d) => {
      const map: Record<string, string> = {};
      for (const m of d.members || []) map[m.id] = m.fullName;
      setNames(map);
    });
  }, [id]);

  async function load() {
    const res = await fetch(`/api/messes/${id}/finance/balances?year=${year}&month=${month}`);
    const j = await res.json();
    if (res.ok) setData(j);
  }
  useEffect(() => { load(); }, [id]);

  return (
    <div className="space-y-4">
      <Link href={`/messes/${id}/finance`} className="text-sm text-zinc-500">← {t("finance.hub")}</Link>
      <h1 className="text-lg font-bold">{t("finance.balTitle")}</h1>
      <div className="flex gap-2 items-center flex-wrap">
        <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="flex-1 sm:flex-none sm:w-24 border rounded-full px-4 py-3 text-base sm:text-sm min-h-[44px]" aria-label={t("reports.year")} />
        <input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value))} className="flex-1 sm:flex-none sm:w-20 border rounded-full px-4 py-3 text-base sm:text-sm min-h-[44px]" aria-label={t("reports.month")} />
        <button onClick={load} className="px-6 py-3 border rounded-full text-sm min-h-[44px] bg-white">{t("common.load")}</button>
      </div>

      {data && (
        <>
          <div className="rounded-2xl border bg-white p-4">
            <div className="text-sm">{t("finance.mealRate")}: <b>{formatCurrency(Math.round(data.mealRateBDT * 100), locale)}</b></div>
            <div className="text-xs text-zinc-500 mt-1">{data.breakdown}</div>
          </div>

          <div className="bg-white border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[680px]">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 text-xs text-zinc-500"><tr><th className="text-left p-3">{t("settlements.memberCol")}</th><th className="text-center p-3">{t("settlements.mealsCol")}</th><th className="text-right p-3">{t("settlements.mealCostCol")}</th><th className="text-right p-3">{t("finance.depositMonthCol")}</th><th className="text-center p-3">{t("finance.statusCol")}</th><th className="text-right p-3">{t("finance.balanceCol")}</th></tr></thead>
              <tbody>
                {data.members.map((m) => (
                  <tr key={m.memberId} className="border-t">
                    <td className="p-3 text-xs">{names[m.memberId] || m.memberId.slice(0, 6)}</td>
                    <td className="p-3 text-center">{formatNumber(m.totalMeals, locale)}</td>
                    <td className="p-3 text-right">{formatCurrency(m.mealCostPaisa, locale)}</td>
                    <td className="p-3 text-right text-emerald-700">{formatCurrency(m.depositPaisa, locale)}</td>
                    <td className="p-3 text-center"><span className={`text-xs rounded-full px-2 py-1 ${m.status === "due" ? "bg-red-100" : m.status === "advance" ? "bg-emerald-100" : "bg-zinc-100"}`}>{t(`finance.${m.status}`)}</span></td>
                    <td className="p-3 text-right font-bold">{formatCurrency(m.balancePaisa, locale)}</td>
                  </tr>
                ))}
                </tbody>
                </table>
              </div>
            </div>
          </div>
          <p className="text-xs text-zinc-500">{t("finance.statusNote")}</p>
        </>
      )}
    </div>
  );
}
