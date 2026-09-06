"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/i18n/provider";
import { formatCurrency, formatNumber } from "@/i18n/dict";

type Exp = { id: string; date: string; amountPaisa: number; status: string; description: string | null; categoryId: string | null };

export default function ExpensesPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useLocale();
  const [expenses, setExpenses] = useState<Exp[]>([]);
  const [filter, setFilter] = useState("all");
  const [dash, setDash] = useState<{ counts: { pending: number; approved: number }; totals: { pendingPaisa: number; approvedPaisa: number } } | null>(null);

  async function load() {
    const qs = filter === "all" ? "" : `?status=${filter}`;
    const res = await fetch(`/api/messes/${id}/expenses${qs}`);
    const data = await res.json();
    if (res.ok) setExpenses(data.expenses);
    const dRes = await fetch(`/api/messes/${id}/expenses/dashboard`);
    const dData = await dRes.json();
    if (dRes.ok) setDash(dData);
  }
  useEffect(() => { load(); }, [id, filter]);

  async function approve(expId: string) {
    const res = await fetch(`/api/messes/${id}/expenses/${expId}/approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    if (res.ok) load();
    else alert((await res.json()).error);
  }
  async function reject(expId: string) {
    const note = prompt(t("expenses.rejectReason") || "Reason?");
    const res = await fetch(`/api/messes/${id}/expenses/${expId}/reject`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note: note || "" }) });
    if (res.ok) load();
    else alert((await res.json()).error);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href={`/messes/${id}`} className="text-sm text-zinc-500">← {t("nav.overview")}</Link>
        <Link href={`/messes/${id}/expenses/add`} className="ml-auto px-4 py-2 rounded-full bg-zinc-900 text-white text-sm">{t("expenses.addBtn")}</Link>
      </div>
      <h1 className="text-lg font-bold">{t("expenses.title")}</h1>

      {dash && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border bg-white p-4"><div className="text-xs text-zinc-500">{t("expenses.pending")}</div><div className="font-bold">{formatNumber(dash.counts.pending, locale)} • {formatCurrency(dash.totals.pendingPaisa, locale)}</div></div>
          <div className="rounded-xl border bg-white p-4"><div className="text-xs text-zinc-500">{t("expenses.approved")}</div><div className="font-bold text-emerald-700">{formatNumber(dash.counts.approved, locale)} • {formatCurrency(dash.totals.approvedPaisa, locale)}</div></div>
          <Link href={`/messes/${id}/expenses/categories`} className="rounded-xl border bg-white p-4 hover:bg-zinc-50"><div className="text-xs text-zinc-500">{t("expenses.categories")}</div><div className="font-bold">→</div></Link>
        </div>
      )}

      <div className="flex gap-2 text-sm flex-wrap">
        {(["all", "pending", "approved", "rejected", "cancelled"] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 rounded-full border min-h-[44px] ${filter === s ? "bg-zinc-900 text-white border-zinc-900" : "bg-white"}`}>{s === "all" ? t("expenses.all") : t(`expenses.${s}`)}</button>
        ))}
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto -mx-0">
          <div className="min-w-[600px]">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-xs text-zinc-500"><tr><th className="text-left p-3">{t("expenses.dateCol")}</th><th className="text-left p-3">{t("expenses.descCol")}</th><th className="text-right p-3">{t("expenses.amountCol")}</th><th className="text-center p-3">{t("expenses.statusCol")}</th><th className="text-right p-3">{t("expenses.actionCol")}</th></tr></thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-3 text-xs">{e.date}</td>
                <td className="p-3 text-xs">{e.description || "—"}</td>
                <td className="p-3 text-right font-medium">{formatCurrency(e.amountPaisa, locale)}</td>
                <td className="p-3 text-center"><span className={`text-xs rounded-full px-2 py-1 ${e.status === "pending" ? "bg-amber-100" : e.status === "approved" ? "bg-emerald-100" : e.status === "rejected" ? "bg-red-100" : "bg-zinc-100"}`}>{t(`status.${e.status}`)}</span></td>
                <td className="p-3 text-right flex gap-1 justify-end">
                  {e.status === "pending" && (
                    <>
                      <button onClick={() => approve(e.id)} className="text-xs border rounded-full px-3 py-2 bg-emerald-50 min-h-[36px]">{t("expenses.approve")}</button>
                      <button onClick={() => reject(e.id)} className="text-xs border rounded-full px-3 py-2 bg-red-50 min-h-[36px]">{t("expenses.reject")}</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            </tbody>
            </table>
          </div>
        </div>
        {expenses.length === 0 && <div className="p-6 text-center text-sm text-zinc-500">{t("expenses.noExpenses")}</div>}
      </div>
      <p className="text-xs text-zinc-500">{t("expenses.thresholdNote")}</p>
    </div>
  );
}
