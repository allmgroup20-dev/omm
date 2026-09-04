"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Member = { id: string; fullName: string };
type Deposit = { id: string; memberId: string; date: string; amountPaisa: number; paymentMethod: string; status: string; note: string | null };

export default function DepositsPage() {
  const { id } = useParams<{ id: string }>();
  const [members, setMembers] = useState<Member[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [form, setForm] = useState({ memberId: "", date: new Date().toISOString().slice(0, 10), amount: "", paymentMethod: "cash", note: "" });
  const [msg, setMsg] = useState("");

  async function load() {
    const [mRes, dRes] = await Promise.all([fetch(`/api/messes/${id}/members`), fetch(`/api/messes/${id}/deposits`)]);
    const mData = await mRes.json();
    const dData = await dRes.json();
    if (mRes.ok) setMembers(mData.members.map((m: { id: string; fullName: string }) => ({ id: m.id, fullName: m.fullName })));
    if (dRes.ok) setDeposits(dData.deposits);
  }
  useEffect(() => { load(); }, [id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const res = await fetch(`/api/messes/${id}/deposits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: form.memberId, date: form.date, amount: parseFloat(form.amount) || 0, paymentMethod: form.paymentMethod, note: form.note, clientRefId: `dep-${Date.now()}` }),
    });
    const data = await res.json();
    if (!res.ok) setMsg(data.error || "Failed");
    else {
      setMsg(`Saved ৳${(data.deposit.amountPaisa / 100).toFixed(2)} — Balance ৳${(data.balancePaisa / 100).toFixed(2)}`);
      setForm({ ...form, amount: "", note: "" });
      load();
    }
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <Link href={`/messes/${id}/finance`} className="text-sm text-zinc-500">← Finance Hub</Link>
      <h1 className="text-lg font-bold">Deposits — টাকা জমা</h1>
      {msg && <div className="rounded-xl border p-3 text-sm bg-white break-all">{msg}</div>}
      <form onSubmit={submit} className="bg-white border rounded-2xl p-5 space-y-3">
        <div className="grid md:grid-cols-3 gap-3">
          <div><label className="text-xs">Member *</label><select value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1" required><option value="">— Select —</option>{members.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}</select></div>
          <div><label className="text-xs">Date</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1" required /></div>
          <div><label className="text-xs">Amount (BDT) *</label><input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1" required /></div>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div><label className="text-xs">Payment</label><select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1"><option value="cash">cash</option><option value="bank">bank</option><option value="mobile">mobile</option><option value="other">other</option></select></div>
          <div><label className="text-xs">Note</label><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1" placeholder="Transaction ID, note" /></div>
        </div>
        <button className="w-full rounded-full bg-zinc-900 text-white py-3 text-sm">Add Deposit</button>
      </form>

      <div className="bg-white border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500"><tr><th className="text-left p-3">Date</th><th className="text-left p-3">Member</th><th className="text-right p-3">Amount</th><th className="text-center p-3">Method</th><th className="text-center p-3">Status</th></tr></thead>
          <tbody>
            {deposits.map((d) => (
              <tr key={d.id} className="border-t">
                <td className="p-3 text-xs">{d.date}</td>
                <td className="p-3 text-xs">{members.find((m) => m.id === d.memberId)?.fullName || d.memberId.slice(0, 6)}</td>
                <td className="p-3 text-right font-medium">৳{(d.amountPaisa / 100).toFixed(2)}</td>
                <td className="p-3 text-center text-xs">{d.paymentMethod}</td>
                <td className="p-3 text-center"><span className={`text-xs rounded-full px-2 py-1 ${d.status === "active" ? "bg-emerald-100" : "bg-zinc-200"}`}>{d.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {deposits.length === 0 && <div className="p-6 text-center text-sm text-zinc-500">No deposits yet</div>}
      </div>
    </div>
  );
}
