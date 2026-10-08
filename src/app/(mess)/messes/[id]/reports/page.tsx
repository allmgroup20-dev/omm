"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/i18n/provider";
import { formatCurrency, formatNumber } from "@/i18n/dict";

type Market = { finalPaisa: number; date: string };
type Money = { amountPaisa: number };
type Meal = { quantityScaled: number };
type Settlement = { year: number; month: number; totalMealsScaled: number; mealRatePaisa: number; totalMarketPaisa: number; totalOtherExpensePaisa: number; status: string };
type Data = {
  date?: string; year?: number; month?: number;
  markets?: Market[]; expenses?: Money[]; deposits?: Money[]; meals?: Meal[];
  settlement?: Settlement | null;
  settlements?: Settlement[];
  totalMeals?: number; totalExpensePaisa?: number; totalDepositPaisa?: number;
};

const sum = (rows: { amountPaisa: number }[] | undefined) => (rows || []).reduce((a, r) => a + (r.amountPaisa || 0), 0);

export default function ReportsPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useLocale();
  const [type, setType] = useState("monthly");
  const [ym, setYm] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
  });
  const [year, setYear] = useState(new Date().getFullYear());
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<Data | null>(null);
  const [msg, setMsg] = useState("");

  async function load() {
    setMsg("");
    let url = "";
    if (type === "daily") url = `/api/messes/${id}/reports?type=daily&date=${date}`;
    else if (type === "monthly") {
      const [y, m] = ym.split("-");
      url = `/api/messes/${id}/reports?type=monthly&year=${y}&month=${m}`;
    } else if (type === "yearly") url = `/api/messes/${id}/reports?type=yearly&year=${year}`;
    const res = await fetch(url);
    const j = await res.json();
    if (!res.ok) setMsg(j.error);
    else setData(j);
  }
  useEffect(() => { load(); }, [id, type, date, ym, year]);

  function exportJson() {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${type}-${type === "monthly" ? ym : type === "daily" ? date : year}.json`;
    a.click();
  }

  const mealQty = (data?.meals || []).reduce((a, r) => a + (r.quantityScaled || 0), 0) / 100;
  const marketSum = (data?.markets || []).reduce((a, r) => a + (r.finalPaisa || 0), 0);

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <Link href={`/messes/${id}`} className="text-sm text-zinc-500">← {t("nav.overview")}</Link>
      <h1 className="text-lg font-bold">{t("reports.title")}</h1>

      <div className="bg-white border rounded-2xl p-4 sm:p-5 flex flex-wrap gap-3 items-end no-print">
        <div><label className="text-xs font-medium block">{t("reports.type")}</label><select value={type} onChange={(e) => setType(e.target.value)} className="w-full border rounded-xl px-4 py-3 text-base sm:text-sm mt-1 min-h-[44px] bg-white"><option value="daily">{t("reports.daily")}</option><option value="monthly">{t("reports.monthly")}</option><option value="yearly">{t("reports.yearly")}</option></select></div>
        {type === "daily" && <div><label className="text-xs font-medium block">{t("common.date")}</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border rounded-xl px-4 py-3 text-base sm:text-sm mt-1 min-h-[44px]" /></div>}
        {type === "yearly" && <div><label className="text-xs font-medium block">{t("reports.year")}</label><input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-28 border rounded-xl px-4 py-3 text-base sm:text-sm mt-1 min-h-[44px]" /></div>}
        {type === "monthly" && <div><label className="text-xs font-medium block">{t("reports.month")}</label><input type="month" value={ym} onChange={(e) => e.target.value && setYm(e.target.value)} className="border rounded-xl px-4 py-3 text-base sm:text-sm mt-1 min-h-[44px]" /></div>}
        <button onClick={exportJson} className="px-5 py-3 border rounded-full text-sm min-h-[44px]">{t("reports.exportJson")}</button>
        <button onClick={() => window.print()} className="px-5 py-3 border rounded-full text-sm min-h-[44px]">{t("reports.printBtn")}</button>
      </div>

      {msg && <div className="rounded-xl border p-3 text-sm bg-red-50 text-red-700">{msg}</div>}

      {data && type === "daily" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-2xl border bg-white p-4"><div className="text-xs text-zinc-500">{t("reports.kpiMeals")}</div><div className="text-xl font-bold tabular-nums">{formatNumber(mealQty, locale)}</div></div>
          <div className="rounded-2xl border bg-white p-4"><div className="text-xs text-zinc-500">{t("reports.kpiMarket")}</div><div className="text-xl font-bold tabular-nums">{formatCurrency(marketSum, locale)}</div><div className="text-xs text-zinc-500">{(data.markets || []).length} {t("market.entriesCount")}</div></div>
          <div className="rounded-2xl border bg-white p-4"><div className="text-xs text-zinc-500">{t("reports.kpiExpenses")}</div><div className="text-xl font-bold tabular-nums">{formatCurrency(sum(data.expenses), locale)}</div></div>
          <div className="rounded-2xl border bg-white p-4"><div className="text-xs text-zinc-500">{t("reports.kpiDeposits")}</div><div className="text-xl font-bold text-emerald-700 tabular-nums">{formatCurrency(sum(data.deposits), locale)}</div></div>
        </div>
      )}

      {data && type === "monthly" && (
        <div className="space-y-3">
          {data.settlement && (
            <div className="rounded-2xl border bg-zinc-900 text-white p-4 flex items-center justify-between">
              <div><div className="text-xs text-white/70">{t("reports.rateLabel")}</div><div className="text-2xl font-bold tabular-nums">{formatCurrency(data.settlement.mealRatePaisa, locale)}</div></div>
              <Link href={`/messes/${id}/settlements`} className="px-5 py-2.5 rounded-full bg-white text-zinc-900 text-sm font-medium min-h-[44px] inline-flex items-center">{t("reports.viewSettlement")}</Link>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-2xl border bg-white p-4"><div className="text-xs text-zinc-500">{t("reports.kpiMeals")}</div><div className="text-xl font-bold tabular-nums">{formatNumber(mealQty, locale)}</div></div>
            <div className="rounded-2xl border bg-white p-4"><div className="text-xs text-zinc-500">{t("reports.kpiMarket")}</div><div className="text-xl font-bold tabular-nums">{formatCurrency(marketSum, locale)}</div></div>
            <div className="rounded-2xl border bg-white p-4"><div className="text-xs text-zinc-500">{t("reports.kpiExpenses")}</div><div className="text-xl font-bold tabular-nums">{formatCurrency(sum(data.expenses), locale)}</div></div>
            <div className="rounded-2xl border bg-white p-4"><div className="text-xs text-zinc-500">{t("reports.kpiDeposits")}</div><div className="text-xl font-bold text-emerald-700 tabular-nums">{formatCurrency(sum(data.deposits), locale)}</div></div>
          </div>
          <Link href={`/messes/${id}/finance/dues`} className="block text-center text-sm border border-red-200 text-red-700 rounded-full px-4 py-2.5 min-h-[48px] bg-white">{t("reports.goDues")} →</Link>
        </div>
      )}

      {data && type === "yearly" && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl border bg-white p-3 sm:p-4"><div className="text-xs text-zinc-500">{t("reports.kpiMeals")}</div><div className="text-lg sm:text-xl font-bold tabular-nums">{formatNumber(data.totalMeals || 0, locale)}</div></div>
            <div className="rounded-2xl border bg-white p-3 sm:p-4"><div className="text-xs text-zinc-500">{t("reports.kpiExpenses")}</div><div className="text-lg sm:text-xl font-bold tabular-nums">{formatCurrency(data.totalExpensePaisa || 0, locale)}</div></div>
            <div className="rounded-2xl border bg-white p-3 sm:p-4"><div className="text-xs text-zinc-500">{t("reports.kpiDeposits")}</div><div className="text-lg sm:text-xl font-bold text-emerald-700 tabular-nums">{formatCurrency(data.totalDepositPaisa || 0, locale)}</div></div>
          </div>
          <div className="bg-white border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto hidden sm:block">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 text-xs text-zinc-500"><tr><th className="text-left p-3">{t("reports.monthCol")}</th><th className="text-right p-3">{t("reports.kpiMeals")}</th><th className="text-right p-3">{t("reports.rateLabel")}</th><th className="text-center p-3">{t("common.status")}</th></tr></thead>
                <tbody>
                  {(data.settlements || []).map((s) => (
                    <tr key={`${s.year}-${s.month}`} className="border-t">
                      <td className="p-3">{formatNumber(s.year, locale)}-{String(s.month).padStart(2, "0")}</td>
                      <td className="p-3 text-right tabular-nums">{formatNumber(s.totalMealsScaled / 100, locale)}</td>
                      <td className="p-3 text-right tabular-nums">{formatCurrency(s.mealRatePaisa, locale)}</td>
                      <td className="p-3 text-center"><span className={`text-xs rounded-full px-2 py-1 ${s.status === "final" ? "bg-emerald-100" : "bg-zinc-100"}`}>{t(`status.${s.status}`)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="sm:hidden divide-y">
              {(data.settlements || []).map((s) => (
                <div key={`${s.year}-${s.month}`} className="p-4 flex items-center gap-2">
                  <span className="font-bold">{formatNumber(s.year, locale)}-{String(s.month).padStart(2, "0")}</span>
                  <span className="text-xs text-zinc-500">{formatNumber(s.totalMealsScaled / 100, locale)} {t("reports.kpiMeals")}</span>
                  <span className="ml-auto font-bold tabular-nums">{formatCurrency(s.mealRatePaisa, locale)}</span>
                </div>
              ))}
            </div>
            {(data.settlements || []).length === 0 && <div className="p-6 text-center text-sm text-zinc-500">{t("reports.emptyReport")}</div>}
          </div>
        </div>
      )}

      {data && (
        <details className="bg-white border rounded-2xl p-4 no-print">
          <summary className="text-xs text-zinc-500 cursor-pointer py-1 min-h-[44px] inline-flex items-center">{t("reports.devJson")}</summary>
          <pre className="text-xs overflow-auto max-h-[500px] bg-zinc-50 p-4 rounded-xl mt-2">{JSON.stringify(data, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}
