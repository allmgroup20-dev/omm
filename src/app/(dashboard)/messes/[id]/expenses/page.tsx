"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Exp = { id: string; date: string; amountPaisa: number; status: string; description: string | null; categoryId: string | null };

export default function ExpensesPage() {
  const { id } = useParams<{ id: string }>();
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
    const note = prompt("Reject reason?");
    const res = await fetch(`/api/messes/${id}/expenses/${expId}/reject`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note: note || "" }) });
    if (res.ok) load();
    else alert((await res.json()).error);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href={`/messes/${id}`} className="text-sm text-zinc-500">← Overview</Link>
        <Link href={`/messes/${id}/expenses/add`} className="ml-auto px-4 py-2 rounded-full bg-zinc-900 text-white text-sm">+ খরচ যোগ</Link>
      </div>
      <h1 className="text-lg font-bold">অন্যান্য খরচ</h1>

      {dash && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border bg-white p-4"><div className="text-xs text-zinc-500">Pending</div><div className="font-bold">{dash.counts.pending} • ৳{(dash.totals.pendingPaisa / 100).toFixed(2)}</div></div>
          <div className="rounded-xl border bg-white p-4"><div className="text-xs text-zinc-500">Approved</div><div className="font-bold text-emerald-700">{dash.counts.approved} • ৳{(dash.totals.approvedPaisa / 100).toFixed(2)}</div></div>
          <Link href={`/messes/${id}/expenses/categories`} className="rounded-xl border bg-white p-4 hover:bg-zinc-50"><div className="text-xs text-zinc-500">Categories</div><div className="font-bold">Manage →</div></Link>
        </div>
      )}

      <div className="flex gap-2 text-sm">
        {["all", "pending", "approved", "rejected", "cancelled"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1 rounded-full border ${filter === s ? "bg-zinc-900 text-white" : "bg-white"}`}>{s}</button>
        ))}
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500"><tr><th className="text-left p-3">Date</th><th className="text-left p-3">Description</th><th className="text-right p-3">Amount</th><th className="text-center p-3">Status</th><th className="text-right p-3">Action</th></tr></thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-3 text-xs">{e.date}</td>
                <td className="p-3 text-xs">{e.description || "—"}</td>
                <td className="p-3 text-right font-medium">৳{(e.amountPaisa / 100).toFixed(2)}</td>
                <td className="p-3 text-center"><span className={`text-xs rounded-full px-2 py-1 ${e.status === "pending" ? "bg-amber-100" : e.status === "approved" ? "bg-emerald-100" : e.status === "rejected" ? "bg-red-100" : "bg-zinc-100"}`}>{e.status}</span></td>
                <td className="p-3 text-right flex gap-1 justify-end">
                  {e.status === "pending" && (
                    <>
                      <button onClick={() => approve(e.id)} className="text-xs border rounded-full px-3 py-1 bg-emerald-50">Approve</button>
                      <button onClick={() => reject(e.id)} className="text-xs border rounded-full px-3 py-1 bg-red-50">Reject</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {expenses.length === 0 && <div className="p-6 text-center text-sm text-zinc-500">কোনো খরচ নেই</div>}
      </div>
      <p className="text-xs text-zinc-500">Threshold-এর উপরে খরচ → pending, manager approval প্রয়োজন। Approved খরচই settlement-এ গণনা হয়।</p>
    </div>
  );
}
