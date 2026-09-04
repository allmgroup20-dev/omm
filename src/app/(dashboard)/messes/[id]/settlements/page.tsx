"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Settlement = { id: string; year: number; month: number; mealRatePaisa: number; totalMealsScaled: number; totalMarketPaisa: number; totalOtherExpensePaisa: number; status: string };

export default function SettlementsPage() {
  const { id } = useParams<{ id: string }>();
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
      setMsg(`Generated ${year}-${String(month).padStart(2, "0")} — Rate ৳${(data.settlement.mealRatePaisa / 100).toFixed(2)}`);
      load();
    }
  }

  async function close(sid: string) {
    if (!confirm("Month close করবেন?")) return;
    const res = await fetch(`/api/messes/${id}/settlements/${sid}/close`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) setMsg(data.error);
    else {
      setMsg(`Closed. Warnings: ${data.warnings?.join("; ") || "none"}`);
      load();
    }
  }
  async function reopen(sid: string) {
    const reason = prompt("Reopen reason?");
    if (!reason) return;
    const res = await fetch(`/api/messes/${id}/settlements/${sid}/reopen`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) });
    const data = await res.json();
    if (!res.ok) setMsg(data.error);
    else {
      setMsg("Reopened");
      load();
    }
  }

  return (
    <div className="space-y-4">
      <Link href={`/messes/${id}`} className="text-sm text-zinc-500">← Overview</Link>
      <h1 className="text-lg font-bold">Monthly Settlement</h1>

      <div className="bg-white border rounded-2xl p-5 flex gap-2 items-center">
        <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-24 border rounded-full px-3 py-2 text-sm" />
        <input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-20 border rounded-full px-3 py-2 text-sm" />
        <button onClick={generate} className="px-5 py-2 rounded-full bg-zinc-900 text-white text-sm">Generate</button>
        <span className="text-xs text-zinc-500">Formula: FoodCost ÷ TotalMeals = Rate</span>
      </div>

      {msg && <div className="rounded-xl border p-3 text-sm bg-white break-all">{msg}</div>}

      <div className="bg-white border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500"><tr><th className="text-left p-3">Period</th><th className="text-right p-3">Meals</th><th className="text-right p-3">Market</th><th className="text-right p-3">Other</th><th className="text-right p-3">Rate</th><th className="text-center p-3">Status</th><th className="text-right p-3">Actions</th></tr></thead>
          <tbody>
            {settlements.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-3"><Link href={`/messes/${id}/settlements/${s.id}`} className="underline">{s.year}-{String(s.month).padStart(2, "0")}</Link></td>
                <td className="p-3 text-right">{s.totalMealsScaled / 100}</td>
                <td className="p-3 text-right">৳{(s.totalMarketPaisa / 100).toFixed(2)}</td>
                <td className="p-3 text-right">৳{(s.totalOtherExpensePaisa / 100).toFixed(2)}</td>
                <td className="p-3 text-right font-bold">৳{(s.mealRatePaisa / 100).toFixed(2)}</td>
                <td className="p-3 text-center"><span className={`text-xs rounded-full px-2 py-1 ${s.status === "final" ? "bg-emerald-100" : "bg-zinc-100"}`}>{s.status}</span></td>
                <td className="p-3 text-right flex gap-1 justify-end">
                  {s.status !== "final" ? <button onClick={() => close(s.id)} className="text-xs border rounded-full px-3 py-1 bg-amber-50">Close</button> : <button onClick={() => reopen(s.id)} className="text-xs border rounded-full px-3 py-1">Reopen</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {settlements.length === 0 && <div className="p-6 text-center text-sm text-zinc-500">কোনো settlement নেই — Generate করুন</div>}
      </div>
      <p className="text-xs text-zinc-500">Close Month → validation (missing meals, pending expenses) warning দেখায়, তারপর manager Confirm করলে lock হয়। Reopen audit হয়।</p>
    </div>
  );
}
