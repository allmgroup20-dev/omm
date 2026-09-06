"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/i18n/provider";
import { formatCurrency, formatNumber } from "@/i18n/dict";

type MemberSettle = { memberId: string; fullName: string; totalMeals: number; mealCostPaisa: number; allocatedExpensePaisa: number; previousBalancePaisa: number; depositPaisa: number; closingBalancePaisa: number; status: string };

export default function SettlementDetailPage() {
  const { id, settlementId } = useParams<{ id: string; settlementId: string }>();
  const { t, locale } = useLocale();
  const [settlement, setSettlement] = useState<{ year: number; month: number; mealRatePaisa: number; totalMarketPaisa: number; totalMealsScaled: number; status: string } | null>(null);
  const [members, setMembers] = useState<MemberSettle[]>([]);

  useEffect(() => {
    fetch(`/api/messes/${id}/settlements/${settlementId}`).then((r) => r.json()).then((d) => {
      if (d.settlement) {
        setSettlement(d.settlement);
        setMembers(d.members);
      }
    });
  }, [id, settlementId]);

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
            <thead className="bg-zinc-50"><tr><th className="text-left p-2">{t("settlements.memberCol")}</th><th className="text-center p-2">{t("settlements.mealsCol")}</th><th className="text-right p-2">{t("settlements.mealCostCol")}</th><th className="text-right p-2">{t("settlements.otherAllocCol")}</th><th className="text-right p-2">{t("settlements.depositCol")}</th><th className="text-right p-2">{t("settlements.prevBalCol")}</th><th className="text-right p-2">{t("settlements.closingCol")}</th><th className="text-center p-2">{t("common.status")}</th></tr></thead>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3 text-xs text-zinc-500">{t("settlements.formulaNote")}</div>
      </div>

      <button onClick={() => window.print()} className="px-5 py-2 border rounded-full text-sm">🖨 {t("common.print")} / Export</button>
    </div>
  );
}
