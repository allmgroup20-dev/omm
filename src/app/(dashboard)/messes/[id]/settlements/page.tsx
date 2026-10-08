"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/i18n/provider";
import { formatCurrency, formatNumber } from "@/i18n/dict";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";

type Settlement = { id: string; year: number; month: number; mealRatePaisa: number; totalMealsScaled: number; totalMarketPaisa: number; totalOtherExpensePaisa: number; status: string };

export default function SettlementsPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useLocale();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const now0 = new Date();
  const [ym, setYm] = useState(`${now0.getFullYear()}-${String(now0.getMonth() + 1).padStart(2, "0")}`);
  const [msg, setMsg] = useState("");
  const [sheet, setSheet] = useState<null | { sid: string; mode: "close" | "reopen"; reason: string }>(null);
  const [sheetBusy, setSheetBusy] = useState(false);

  async function load() {
    const res = await fetch(`/api/messes/${id}/settlements`);
    const data = await res.json();
    if (res.ok) setSettlements(data.settlements);
  }
  useEffect(() => { load(); }, [id]);

  async function generate() {
    setMsg("");
    const [year, month] = ym.split("-").map(Number);
    const res = await fetch(`/api/messes/${id}/settlements`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ year, month }) });
    const data = await res.json();
    if (!res.ok) setMsg(data.error);
    else {
      setMsg(`${t("common.success")} — ${formatNumber(year, locale)}-${String(month).padStart(2, "0")}: ${formatCurrency(data.settlement.mealRatePaisa, locale)}`);
      load();
    }
  }

  async function confirmSheet() {
    const target = sheet;
    if (!target) return;
    setSheetBusy(true);
    if (target.mode === "close") {
      const res = await fetch(`/api/messes/${id}/settlements/${target.sid}/close`, { method: "POST" });
      const data = await res.json();
      setSheetBusy(false);
      if (!res.ok) setMsg(data.error);
      else {
        setMsg(`${t("common.success")}: ${(data.warnings || []).join("; ")}`);
        setSheet(null);
        load();
      }
    } else {
      if (!target.reason.trim()) return;
      const res = await fetch(`/api/messes/${id}/settlements/${target.sid}/reopen`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: target.reason.trim() }) });
      const data = await res.json();
      setSheetBusy(false);
      if (!res.ok) setMsg(data.error);
      else {
        setMsg(t("settlements.reopenedMsg"));
        setSheet(null);
        load();
      }
    }
  }

  return (
    <div className="space-y-4">
      <Link href={`/messes/${id}`} className="text-sm text-zinc-500">← {t("nav.overview")}</Link>
      <h1 className="text-lg font-bold">{t("settlements.title")}</h1>

      <div className="bg-white border rounded-2xl p-4 sm:p-5 flex gap-2 items-center flex-wrap">
        <input type="month" value={ym} onChange={(e) => e.target.value && setYm(e.target.value)} className="border rounded-full px-4 py-3 text-base sm:text-sm min-h-[44px] bg-white max-w-full" aria-label={`${t("reports.year")}-${t("reports.month")}`} />
        <button onClick={generate} className="px-6 py-3 rounded-full bg-zinc-900 text-white text-sm min-h-[44px]">{t("settlements.generate")}</button>
        <span className="text-xs text-zinc-500 w-full sm:w-auto">{t("settlements.formula")}<br />{t("settlements.regenHint")}</span>
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
                  {s.status !== "final" ? <button onClick={() => setSheet({ sid: s.id, mode: "close", reason: "" })} className="text-xs border rounded-full px-3 py-2 bg-amber-50 min-h-[44px]">{t("settlements.closeBtn")}</button> : <button onClick={() => setSheet({ sid: s.id, mode: "reopen", reason: "" })} className="text-xs border rounded-full px-3 py-2 min-h-[44px]">{t("settlements.reopenBtn")}</button>}
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
      <ConfirmSheet
        open={!!sheet}
        title={sheet?.mode === "close" ? t("settlements.closeConfirm") : t("settlements.reopenBtn")}
        body={sheet?.mode === "close" ? t("settlements.closeWarn") : undefined}
        confirmLabel={sheet?.mode === "close" ? t("settlements.closeBtn") : t("settlements.reopenBtn")}
        danger={sheet?.mode === "close"}
        busy={sheetBusy}
        input={sheet?.mode === "reopen" ? { value: sheet.reason, onChange: (v) => setSheet((p) => (p ? { ...p, reason: v } : p)), placeholder: t("settlements.reopenReasonPh"), required: true } : undefined}
        onConfirm={confirmSheet}
        onClose={() => !sheetBusy && setSheet(null)}
      />
    </div>
  );
}
