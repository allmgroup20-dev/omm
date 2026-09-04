"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type MemberSettle = { memberId: string; fullName: string; totalMeals: number; mealCostPaisa: number; allocatedExpensePaisa: number; previousBalancePaisa: number; depositPaisa: number; closingBalancePaisa: number; status: string };

export default function SettlementDetailPage() {
  const { id, settlementId } = useParams<{ id: string; settlementId: string }>();
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

  if (!settlement) return <div className="p-6 text-sm">লোড...</div>;

  return (
    <div className="space-y-4">
      <Link href={`/messes/${id}/settlements`} className="text-sm text-zinc-500">← Settlements</Link>
      <h1 className="text-lg font-bold">Settlement {settlement.year}-{String(settlement.month).padStart(2, "0")} <span className={`text-xs rounded-full px-2 py-1 ml-2 ${settlement.status === "final" ? "bg-emerald-100" : "bg-zinc-100"}`}>{settlement.status}</span></h1>

      <div className="rounded-2xl border bg-white p-4 grid grid-cols-3 gap-3 text-center">
        <div><div className="text-xs text-zinc-500">Meal Rate</div><div className="font-bold">৳{(settlement.mealRatePaisa / 100).toFixed(2)}</div></div>
        <div><div className="text-xs text-zinc-500">Total Meals</div><div className="font-bold">{settlement.totalMealsScaled / 100}</div></div>
        <div><div className="text-xs text-zinc-500">Market</div><div className="font-bold">৳{(settlement.totalMarketPaisa / 100).toFixed(2)}</div></div>
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-zinc-50"><tr><th className="text-left p-2">Member</th><th className="text-center p-2">Meals</th><th className="text-right p-2">Meal Cost</th><th className="text-right p-2">Other Allocated</th><th className="text-right p-2">Deposit</th><th className="text-right p-2">Prev Bal</th><th className="text-right p-2">Closing</th><th className="text-center p-2">Status</th></tr></thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.memberId} className="border-t">
                  <td className="p-2 font-medium">{m.fullName}</td>
                  <td className="p-2 text-center">{m.totalMeals}</td>
                  <td className="p-2 text-right">৳{(m.mealCostPaisa / 100).toFixed(2)}</td>
                  <td className="p-2 text-right">৳{(m.allocatedExpensePaisa / 100).toFixed(2)}</td>
                  <td className="p-2 text-right text-emerald-700">৳{(m.depositPaisa / 100).toFixed(2)}</td>
                  <td className="p-2 text-right">৳{(m.previousBalancePaisa / 100).toFixed(2)}</td>
                  <td className={`p-2 text-right font-bold ${m.closingBalancePaisa < 0 ? "text-red-600" : m.closingBalancePaisa > 0 ? "text-emerald-600" : ""}`}>৳{(m.closingBalancePaisa / 100).toFixed(2)}</td>
                  <td className="p-2 text-center"><span className={`rounded-full px-2 py-0.5 ${m.status === "due" ? "bg-red-100" : m.status === "advance" ? "bg-emerald-100" : "bg-zinc-100"}`}>{m.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3 text-xs text-zinc-500">Closing = Previous + Deposit − MealCost − Allocated • Positive=Advance, Negative=Due</div>
      </div>

      <button onClick={() => window.print()} className="px-5 py-2 border rounded-full text-sm">🖨 Print / Export</button>
    </div>
  );
}
