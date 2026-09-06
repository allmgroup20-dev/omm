"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/i18n/provider";
import { formatCurrency, formatNumber } from "@/i18n/dict";

type Settlement = { id: string; year: number; month: number; mealRatePaisa: number; totalMealsScaled: number; totalMarketPaisa: number; totalOtherExpensePaisa: number; status: string };

export default function SettlementsPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useLocale();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch(`/api/messes/${id}/settlements`);
    const data = await res.json();
    if (res.ok) setSettlements(data.settlements);
  }
  useEffect(() => { load(); }, [id]);

  async function generate() {
    setMsg("");
    const res = await fetch(`/api/messes/${id}/settlements`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ year, month }) });
    const data = await res.json();
    if (!res.ok) setMsg(data.error);
    else {
      setMsg(`${t("common.success")} — ${formatNumber(year, locale)}-${String(month).padStart(2, "0")}: ${formatCurrency(data.settlement.mealRatePaisa, locale)}`);
      load();
    }
  }

  async function close(sid: string) {
    if (!confirm(t("settlements.closeConfirm"))) return;
    const res = await fetch(`/api/messes/${id}/settlements/${sid}/close`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) setMsg(data.error);
    else {
      setMsg(`${t("common.success")}: ${(data.warnings || []).join("; ")}`);
      load();
    }
  }
  async function reopen(sid: string) {
    const reason = prompt(t("settlements.reopenReasonPh"));
    if (!reason) return;
    const res = await fetch(`/api/messes/${id}/settlements/${sid}/reopen`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) });
    const data = await res.json();
    if (!res.ok) setMsg(data.error);
    else {
      setMsg(t("settlements.reopenedMsg"));
      load();
    }
  }

  return (
    <div className="space-y-4">
      <Link href={`/messes/${id}`} className="text-sm text-zinc-500">← {t("nav.overview")}</Link>
      <h1 className="text-lg font-bold">{t("settlements.title")}</h1>

      <div className="bg-white border rounded-2xl p-4 sm:p-5 flex gap-2 items-center flex-wrap">
        <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="flex-1 sm:flex-none sm:w-24 border rounded-full px-4 py-3 text-base sm:text-sm min-h-[44px]" aria-label={t("reports.year")} />
        <input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value))} className="flex-1 sm:flex-none sm:w-20 border rounded-full px-4 py-3 text-base sm:text-sm min-h-[44px]" aria-label={t("reports.month")} />
        <button onClick={generate} className="px-6 py-3 rounded-full bg-zinc-900 text-white text-sm min-h-[44px]">{t("settlements.generate")}</button>
        <span className="text-xs text-zinc-500 w-full sm:w-auto">{t("settlements.formula")}</span>
      </div>

      {msg && <div className="rounded-xl border p-3 text-sm bg-white break-all">{msg}</div>}

      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-xs text-zinc-500"><tr><th className="text-left p-3">{t("settlements.periodCol")}</th><th className="text-right p-3">{t("settlements.mealsCol")}</th><th className="text-right p-3">{t("settlements.marketCol")}</th><th className="text-right p-3">{t("settlements.otherCol")}</th><th className="text-right p-3">{t("settlements.rateCol")}</th><th className="text-center p-3">{t("settlements.statusCol")}</th><th className="text-right p-3">{t("settlements.actionsCol")}</th></tr></thead>
          <tbody>
            {settlements.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-3"><Link href={`/messes/${id}/settlements/${s.id}`} className="underline">{formatNumber(s.year, locale)}-{String(s.month).padStart(2, "0")}</Link></td>
                <td className="p-3 text-right">{formatNumber(s.totalMealsScaled / 100, locale)}</td>
                <td className="p-3 text-right">{formatCurrency(s.totalMarketPaisa, locale)}</td>
                <td className="p-3 text-right">{formatCurrency(s.totalOtherExpensePaisa, locale)}</td>
                <td className="p-3 text-right font-bold">{formatCurrency(s.mealRatePaisa, locale)}</td>
                <td className="p-3 text-center"><span className={`text-xs rounded-full px-2 py-1 ${s.status === "final" ? "bg-emerald-100" : "bg-zinc-100"}`}>{t(`status.${s.status}`)}</span></td>
                <td className="p-3 text-right flex gap-1 justify-end">
                  {s.status !== "final" ? <button onClick={() => close(s.id)} className="text-xs border rounded-full px-3 py-2 bg-amber-50 min-h-[36px]">{t("settlements.closeBtn")}</button> : <button onClick={() => reopen(s.id)} className="text-xs border rounded-full px-3 py-2 min-h-[36px]">{t("settlements.reopenBtn")}</button>}
                </td>
              </tr>
            ))}
            </tbody>
            </table>
          </div>
        </div>
        {settlements.length === 0 && <div className="p-6 text-center text-sm text-zinc-500">{t("settlements.noSettlements")}</div>}
      </div>
      <p className="text-xs text-zinc-500">{t("settlements.closeWarn")}</p>
    </div>
  );
}
