"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/i18n/provider";
import { formatCurrency, formatNumber } from "@/i18n/dict";
import { useMyRole } from "@/hooks/useMyRole";

type MemberSettle = { memberId: string; fullName: string; totalMeals: number; mealCostPaisa: number; allocatedExpensePaisa: number; previousBalancePaisa: number; depositPaisa: number; closingBalancePaisa: number; status: string };
type Disposition = { memberId: string; kind: string; amountPaisa: number; createdAt: string };

export default function SettlementDetailPage() {
  const { id, settlementId } = useParams<{ id: string; settlementId: string }>();
  const { t, locale } = useLocale();
  const [settlement, setSettlement] = useState<{ year: number; month: number; mealRatePaisa: number; totalMarketPaisa: number; totalMealsScaled: number; status: string } | null>(null);
  const [members, setMembers] = useState<MemberSettle[]>([]);
  const [dispositions, setDispositions] = useState<Record<string, Disposition>>({});
  const [msg, setMsg] = useState("");
  const { isManager } = useMyRole(id);

  function load() {
    fetch(`/api/messes/${id}/settlements/${settlementId}`).then((r) => r.json()).then((d) => {
      if (d.settlement) {
        setSettlement(d.settlement);
        setMembers(d.members);
      }
      // latest disposition per member (carry/refund of advances)
      const map: Record<string, Disposition> = {};
      for (const a of (d.adjustments || []) as (Disposition & { createdAt: string })[]) {
        const prev = map[a.memberId];
        if (!prev || a.createdAt >= prev.createdAt) map[a.memberId] = a;
      }
      setDispositions(map);
    });
  }

  useEffect(() => {
    load();
  }, [id, settlementId]);

  async function setDisposition(memberId: string, kind: "carry" | "refund") {
    if (!confirm(kind === "carry" ? t("settlements.carryConfirm") : t("settlements.refundConfirm"))) return;
    const note = window.prompt(t("settlements.dispNotePh") || "") || "";
    setMsg("");
    const res = await fetch(`/api/messes/${id}/settlements/${settlementId}/members/${memberId}/disposition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, note }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setMsg(data.error || t("errors.saveFail"));
    else {
      setMsg(kind === "carry" ? t("settlements.dispCarried") : t("settlements.dispRefunded"));
      load();
    }
  }

  function dispBadge(memberId: string) {
    const d = dispositions[memberId];
    if (!d) return <span className="text-[11px] text-zinc-400">{t("settlements.dispPending")}</span>;
    return d.kind === "refund"
      ? <span className="text-[11px] rounded-full px-2 py-0.5 bg-sky-100 text-sky-800">{t("settlements.dispRefunded")}</span>
      : <span className="text-[11px] rounded-full px-2 py-0.5 bg-emerald-100 text-emerald-800">{t("settlements.dispCarried")}</span>;
  }

  if (!settlement) return <div className="p-6 text-sm">{t("common.loading")}</div>;

  return (
    <div className="space-y-4">
      <Link href={`/messes/${id}/settlements`} className="text-sm text-zinc-500">← {t("settlements.title")}</Link>
      <h1 className="text-lg font-bold">{t("settlements.title")} {formatNumber(settlement.year, locale)}-{String(settlement.month).padStart(2, "0")} <span className={`text-xs rounded-full px-2 py-1 ml-2 ${settlement.status === "final" ? "bg-emerald-100" : "bg-zinc-100"}`}>{t(`status.${settlement.status}`)}</span></h1>

      <div className="rounded-2xl border bg-white p-4 grid grid-cols-3 gap-3 text-center">
        <div><div className="text-xs text-zinc-500">{t("finance.mealRate")}</div><div className="font-bold">{formatCurrency(settlement.mealRatePaisa, locale)}</div></div>
        <div><div className="text-xs text-zinc-500">{t("settlements.mealsCol")}</div><div className="font-bold">{formatNumber(settlement.totalMealsScaled / 100, locale)}</div></div>
        <div><div className="text-xs text-zinc-500">{t("settlements.marketCol")}</div><div className="font-bold">{formatCurrency(settlement.totalMarketPaisa, locale)}</div></div>
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-zinc-50"><tr><th className="text-left p-2">{t("settlements.memberCol")}</th><th className="text-center p-2">{t("settlements.mealsCol")}</th><th className="text-right p-2">{t("settlements.mealCostCol")}</th><th className="text-right p-2">{t("settlements.otherAllocCol")}</th><th className="text-right p-2">{t("settlements.depositCol")}</th><th className="text-right p-2">{t("settlements.prevBalCol")}</th><th className="text-right p-2">{t("settlements.closingCol")}</th><th className="text-center p-2">{t("common.status")}</th><th className="text-center p-2">{t("settlements.dispCol")}</th></tr></thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.memberId} className="border-t">
                  <td className="p-2 font-medium">{m.fullName}</td>
                  <td className="p-2 text-center">{formatNumber(m.totalMeals, locale)}</td>
                  <td className="p-2 text-right">{formatCurrency(m.mealCostPaisa, locale)}</td>
                  <td className="p-2 text-right">{formatCurrency(m.allocatedExpensePaisa, locale)}</td>
                  <td className="p-2 text-right text-emerald-700">{formatCurrency(m.depositPaisa, locale)}</td>
                  <td className="p-2 text-right">{formatCurrency(m.previousBalancePaisa, locale)}</td>
                  <td className={`p-2 text-right font-bold ${m.closingBalancePaisa < 0 ? "text-red-600" : m.closingBalancePaisa > 0 ? "text-emerald-600" : ""}`}>{formatCurrency(m.closingBalancePaisa, locale)}</td>
                  <td className="p-2 text-center"><span className={`rounded-full px-2 py-0.5 ${m.status === "due" ? "bg-red-100" : m.status === "advance" ? "bg-emerald-100" : "bg-zinc-100"}`}>{t(`finance.${m.status}`)}</span></td>
                  <td className="p-2 text-center whitespace-nowrap">
                    {m.closingBalancePaisa > 0 ? (
                      <span className="inline-flex flex-col gap-1 items-center">
                        {dispBadge(m.memberId)}
                        {isManager && (
                          <span className="inline-flex gap-1">
                            <button onClick={() => setDisposition(m.memberId, "carry")} className="text-[11px] border rounded-full px-2 py-1 hover:bg-emerald-50 min-h-[32px]">{t("settlements.carryBtn")}</button>
                            <button onClick={() => setDisposition(m.memberId, "refund")} className="text-[11px] border rounded-full px-2 py-1 hover:bg-sky-50 min-h-[32px]">{t("settlements.refundBtn")}</button>
                          </span>
                        )}
                      </span>
                    ) : <span className="text-[11px] text-zinc-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3 text-xs text-zinc-500">{t("settlements.formulaNote")}</div>
      </div>

      <button onClick={() => window.print()} className="px-5 py-2 border rounded-full text-sm">🖨 {t("common.print")} / Export</button>
      {msg && <div className="rounded-xl border p-3 text-sm bg-white break-all">{msg}</div>}
    </div>
  );
}
