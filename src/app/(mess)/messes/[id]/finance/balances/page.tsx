"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/i18n/provider";
import { formatCurrency, formatNumber } from "@/i18n/dict";

type Bal = { memberId: string; userId: string; totalMeals: number; mealCostPaisa: number; depositPaisa: number; balancePaisa: number; openingPaisa: number; dueCollectedPaisa: number; dueRemainingPaisa: number; newDepositPaisa: number; dueSourceYm: string | null; status: string };

export default function BalancesPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useLocale();
  const now = new Date();
  const [ym, setYm] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
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
    const [y, m] = ym.split("-");
    const res = await fetch(`/api/messes/${id}/finance/balances?year=${y}&month=${m}`);
    const j = await res.json();
    if (res.ok) setData(j);
  }
  useEffect(() => { load(); }, [id, ym]);

  return (
    <div className="space-y-4">
      <Link href={`/messes/${id}`} className="text-sm text-zinc-500">← {t("nav.overview")}</Link>
      <h1 className="text-lg font-bold">{t("finance.balTitle")}</h1>
      <div className="flex gap-2 items-center flex-wrap">
        <input type="month" value={ym} onChange={(e) => e.target.value && setYm(e.target.value)} className="flex-1 sm:flex-none sm:w-48 border rounded-full px-4 py-3 text-base sm:text-sm min-h-[44px]" aria-label={t("reports.month")} />
      </div>

      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-2xl border bg-white p-3"><div className="text-xs text-zinc-500">{t("finance.totalCost")}</div><div className="font-bold tabular-nums">{formatCurrency(data.members.reduce((a, m) => a + m.mealCostPaisa, 0), locale)}</div></div>
            <div className="rounded-2xl border bg-white p-3"><div className="text-xs text-zinc-500">{t("finance.totalDeposits")}</div><div className="font-bold text-emerald-700 tabular-nums">{formatCurrency(data.members.reduce((a, m) => a + m.depositPaisa, 0), locale)}</div></div>
            <div className="rounded-2xl border bg-white p-3"><div className="text-xs text-zinc-500">{t("finance.totalDue")}</div><div className="font-bold text-red-600 tabular-nums">{formatCurrency(data.members.reduce((a, m) => a + (m.dueRemainingPaisa || 0), 0), locale)}</div></div>
            <div className="rounded-2xl border bg-white p-3"><div className="text-xs text-zinc-500">{t("finance.mealRate")}</div><div className="font-bold tabular-nums">{formatCurrency(Math.round(data.mealRateBDT * 100), locale)}</div></div>
          </div>
          <p className="text-xs text-zinc-500">{t("finance.balanceLegend")}</p>

          <div className="bg-white border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto hidden md:block">
              <div className="min-w-[680px]">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 text-xs text-zinc-500"><tr><th className="text-left p-3">{t("settlements.memberCol")}</th><th className="text-center p-3">{t("settlements.mealsCol")}</th><th className="text-right p-3">{t("settlements.mealCostCol")}</th><th className="text-right p-3">{t("finance.depositMonthCol")}</th><th className="text-center p-3">{t("finance.statusCol")}</th><th className="text-right p-3">{t("finance.balanceCol")}</th></tr></thead>
              <tbody>
                {data.members.map((m) => (
                  <tr key={m.memberId} className="border-t">
                    <td className="p-3 text-xs">{names[m.memberId] || t("finance.unknownMember")}</td>
                    <td className="p-3 text-center">{formatNumber(m.totalMeals, locale)}</td>
                    <td className="p-3 text-right">{formatCurrency(m.mealCostPaisa, locale)}</td>
                    <td className="p-3 text-right text-emerald-700">{formatCurrency(m.depositPaisa, locale)}</td>
                    <td className="p-3 text-center"><span className={`text-xs rounded-full px-2 py-1 ${m.status === "due" ? "bg-red-100" : m.status === "advance" ? "bg-emerald-100" : "bg-zinc-100"}`}>{t(`finance.${m.status}`)}</span>{(m.dueRemainingPaisa || 0) > 0 && <Link href={`/messes/${id}/finance/dues`} className="block mx-auto mt-1 text-xs border border-red-200 text-red-700 rounded-full px-4 py-2.5 min-h-[44px]">{t("mess.qaDues")} →</Link>}</td>
                    <td className="p-3 text-right font-bold">{formatCurrency(m.balancePaisa, locale)}</td>
                  </tr>
                ))}
                </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="md:hidden divide-y">
            {data.members.map((m) => {
              const owes = (m.dueRemainingPaisa || 0) > 0;
              const gets = m.status === "advance";
              return (
                <div key={m.memberId} className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm flex-1 min-w-0 truncate">{names[m.memberId] || t("finance.unknownMember")}</span>
                    <span className={`text-xs rounded-full px-2 py-1 ${m.status === "due" ? "bg-red-100" : m.status === "advance" ? "bg-emerald-100" : "bg-zinc-100"}`}>{t(`finance.${m.status}`)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-zinc-500">
                    <span>{t("settlements.mealsCol")}: <b className="text-zinc-900">{formatNumber(m.totalMeals, locale)}</b></span>
                    <span>{t("settlements.mealCostCol")}: <b className="text-zinc-900 tabular-nums">{formatCurrency(m.mealCostPaisa, locale)}</b></span>
                    <span>{t("finance.depositMonthCol")}: <b className="text-emerald-700 tabular-nums">{formatCurrency(m.depositPaisa, locale)}</b></span>
                  </div>
                  <div className={`rounded-xl p-3 text-center font-bold tabular-nums ${owes ? "bg-red-50 text-red-700" : gets ? "bg-emerald-50 text-emerald-700" : "bg-zinc-50 text-zinc-700"}`}>
                    {owes ? `${t("finance.youOwe")} ${formatCurrency(m.dueRemainingPaisa, locale)}` : gets ? `${t("finance.youGet")} ${formatCurrency(m.balancePaisa, locale)}` : t("finance.settledOk")}
                  </div>
                  {owes && <Link href={`/messes/${id}/finance/dues`} className="block text-center text-sm border border-red-200 text-red-700 rounded-full px-4 py-2.5 min-h-[48px]">{t("mess.qaDues")} →</Link>}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-zinc-500">{t("finance.statusNote")}</p>
        </>
      )}
    </div>
  );
}
