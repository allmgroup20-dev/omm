"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/i18n/provider";
import { formatCurrency, formatNumber } from "@/i18n/dict";
import { useMyRole } from "@/hooks/useMyRole";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";

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
  const [dispTarget, setDispTarget] = useState<{ memberId: string; kind: "carry" | "refund"; note: string } | null>(null);
  const [dispBusy, setDispBusy] = useState(false);

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

  async function confirmDisposition() {
    const target = dispTarget;
    if (!target) return;
    setDispBusy(true);
    setMsg("");
    const res = await fetch(`/api/messes/${id}/settlements/${settlementId}/members/${target.memberId}/disposition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: target.kind, note: target.note }),
    });
    const data = await res.json().catch(() => ({}));
    setDispBusy(false);
    if (!res.ok) setMsg(data.error || t("errors.saveFail"));
    else {
      setMsg(target.kind === "carry" ? t("settlements.dispCarried") : t("settlements.dispRefunded"));
      setDispTarget(null);
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

      <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800">{t("settlements.howToRead")}</div>

      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto hidden lg:block print:block">
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
                            <button onClick={() => setDispTarget({ memberId: m.memberId, kind: "carry", note: "" })} className="text-[11px] border rounded-full px-2 py-1 hover:bg-emerald-50 min-h-[44px]">{t("settlements.carryBtn")}</button>
                            <button onClick={() => setDispTarget({ memberId: m.memberId, kind: "refund", note: "" })} className="text-[11px] border rounded-full px-2 py-1 hover:bg-sky-50 min-h-[44px]">{t("settlements.refundBtn")}</button>
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
        <div className="lg:hidden print:hidden divide-y">
          {members.map((m) => {
            const owes = m.closingBalancePaisa < 0;
            const gets = m.closingBalancePaisa > 0;
            return (
              <div key={m.memberId} className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm flex-1 min-w-0 truncate">{m.fullName}</span>
                  <span className={`text-xs rounded-full px-2 py-1 ${m.status === "due" ? "bg-red-100" : m.status === "advance" ? "bg-emerald-100" : "bg-zinc-100"}`}>{t(`finance.${m.status}`)}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-zinc-500">
                  <span>{t("settlements.mealsCol")}: <b className="text-zinc-900">{formatNumber(m.totalMeals, locale)}</b></span>
                  <span>{t("settlements.mealCostCol")}: <b className="text-zinc-900 tabular-nums">{formatCurrency(m.mealCostPaisa, locale)}</b></span>
                  <span>{t("settlements.otherAllocCol")}: <b className="text-zinc-900 tabular-nums">{formatCurrency(m.allocatedExpensePaisa, locale)}</b></span>
                  <span>{t("settlements.depositCol")}: <b className="text-emerald-700 tabular-nums">{formatCurrency(m.depositPaisa, locale)}</b></span>
                  <span>{t("settlements.prevBalCol")}: <b className="text-zinc-900 tabular-nums">{formatCurrency(m.previousBalancePaisa, locale)}</b></span>
                </div>
                <div className={`rounded-xl p-3 text-center font-bold tabular-nums ${owes ? "bg-red-50 text-red-700" : gets ? "bg-emerald-50 text-emerald-700" : "bg-zinc-50 text-zinc-700"}`}>
                  {owes ? `${t("finance.youOwe")} ${formatCurrency(-m.closingBalancePaisa, locale)}` : gets ? `${t("finance.youGet")} ${formatCurrency(m.closingBalancePaisa, locale)}` : t("finance.settledOk")}
                </div>
                {m.closingBalancePaisa > 0 && (
                  <div className="flex flex-col gap-2 items-stretch">
                    {dispBadge(m.memberId)}
                    {isManager && (
                      <div className="flex gap-2">
                        <button onClick={() => setDispTarget({ memberId: m.memberId, kind: "carry", note: "" })} className="flex-1 text-xs border rounded-full px-3 py-2.5 hover:bg-emerald-50 min-h-[48px]">{t("settlements.carryBtn")}</button>
                        <button onClick={() => setDispTarget({ memberId: m.memberId, kind: "refund", note: "" })} className="flex-1 text-xs border rounded-full px-3 py-2.5 hover:bg-sky-50 min-h-[48px]">{t("settlements.refundBtn")}</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="p-3 text-xs text-zinc-500">{t("settlements.formulaNote")}</div>
      </div>

      <button onClick={() => window.print()} className="px-5 py-2 border rounded-full text-sm min-h-[44px] no-print">{t("common.print")}</button>
      {msg && <div className="rounded-xl border p-3 text-sm bg-white break-all">{msg}</div>}
      <ConfirmSheet
        open={!!dispTarget}
        title={dispTarget?.kind === "carry" ? t("settlements.carryConfirm") : t("settlements.refundConfirm")}
        confirmLabel={dispTarget?.kind === "carry" ? t("settlements.carryBtn") : t("settlements.refundBtn")}
        busy={dispBusy}
        input={{ value: dispTarget?.note || "", onChange: (v) => setDispTarget((p) => (p ? { ...p, note: v } : p)), placeholder: t("settlements.dispNotePh") }}
        onConfirm={confirmDisposition}
        onClose={() => !dispBusy && setDispTarget(null)}
      />
    </div>
  );
}
