"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function AddExpensePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [members, setMembers] = useState<{ id: string; fullName: string }[]>([]);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), categoryId: "", amount: "", paidBy: "", paymentMethod: "cash", description: "", notes: "" });
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/messes/${id}/expenses/categories`).then((r) => r.json()).then((d) => { if (d.categories) setCats(d.categories); });
    fetch(`/api/messes/${id}/members`).then((r) => r.json()).then((d) => { if (d.members) setMembers(d.members.map((m: { id: string; fullName: string }) => ({ id: m.id, fullName: m.fullName }))); });
  }, [id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`/api/messes/${id}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: form.date,
          categoryId: form.categoryId || null,
          amount: parseFloat(form.amount) || 0,
          paidBy: form.paidBy || null,
          paymentMethod: form.paymentMethod,
          description: form.description,
          notes: form.notes,
          clientRefId: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || JSON.stringify(data));
      setMsg(data.needsApproval ? "Pending — manager approval required (amount > threshold)" : "Approved — saved");
      setTimeout(() => router.push(`/messes/${id}/expenses`), 800);
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link href={`/messes/${id}/expenses`} className="text-sm text-zinc-500">← Expenses</Link>
      <h1 className="text-lg font-bold">খরচ যোগ করুন</h1>
      {msg && <div className="rounded-xl border p-3 text-sm bg-white">{msg}</div>}
      <form onSubmit={submit} className="bg-white border rounded-2xl p-6 space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div><label className="text-xs">Date *</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1" required /></div>
          <div><label className="text-xs">Amount (BDT) *</label><input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1" placeholder="e.g. 500" required /></div>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div><label className="text-xs">Category</label><select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1"><option value="">— No category —</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="text-xs">Paid By</label><select value={form.paidBy} onChange={(e) => setForm({ ...form, paidBy: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1"><option value="">— Select —</option>{members.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}</select></div>
        </div>
        <div><label className="text-xs">Payment Method</label><select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1"><option value="cash">cash</option><option value="bank">bank</option><option value="mobile">mobile</option><option value="other">other</option></select></div>
        <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description (e.g. Gas, Electricity, WiFi)" className="w-full border rounded-xl px-3 py-2 text-sm" />
        <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes (optional)" className="w-full border rounded-xl px-3 py-2 text-sm" rows={2} />
        <button disabled={saving} className="w-full rounded-full bg-zinc-900 text-white py-3 text-sm disabled:opacity-50">{saving ? "Saving..." : "Save Expense"}</button>
        <p className="text-xs text-zinc-500 text-center">Threshold check backend-এ হয় — বেশি হলে pending। Duplicate clientRefId blocked।</p>
      </form>
    </div>
  );
}
