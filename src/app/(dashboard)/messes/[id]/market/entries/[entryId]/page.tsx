"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/i18n/provider";
import { formatCurrency, formatDateBD } from "@/i18n/dict";

type Entry = { id: string; date: string; vendorId: string | null; classification: string; paymentMethod: string; totalPaisa: number; transportPaisa: number; discountPaisa: number; finalPaisa: number; notes: string | null; status: string };
type Item = { id: string; productNameSnapshot: string; categoryNameSnapshot: string | null; quantityScaled: number; unit: string; unitPricePaisa: number; totalPaisa: number };

export default function EntryDetailPage() {
  const { id, entryId } = useParams<{ id: string; entryId: string }>();
  const { t, locale } = useLocale();
  const router = useRouter();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ date: "", classification: "food", paymentMethod: "cash", discount: "0", transport: "0", purchasedBy: "", notes: "" });
  const [members, setMembers] = useState<{ id: string; displayName: string }[]>([]);

  async function load() {
    const res = await fetch(`/api/messes/${id}/market/entries/${entryId}`);
    const data = await res.json();
    if (res.ok) {
      setEntry(data.entry);
      setItems(data.items);
      setForm({ date: data.entry.date, classification: data.entry.classification, paymentMethod: data.entry.paymentMethod, discount: (data.entry.discountPaisa / 100).toString(), transport: ((data.entry.transportPaisa || 0) / 100).toString(), purchasedBy: data.entry.purchasedBy || "", notes: data.entry.notes || "" });
    } else setMsg(data.error);
  }
  useEffect(() => {
    load();
    fetch(`/api/messes/${id}/members`).then((r) => r.json()).then((d) => {
      if (d.members) setMembers(d.members.filter((m: { status: string }) => m.status === "active").map((m: { id: string; fullName: string; displayName: string }) => ({ id: m.id, displayName: m.fullName || m.displayName })));
    });
  }, [id, entryId]);

  async function save() {
    const payload: Record<string, unknown> = { date: form.date, purchasedBy: form.purchasedBy || undefined, classification: form.classification, paymentMethod: form.paymentMethod, discount: parseFloat(form.discount) || 0, transport: parseFloat(form.transport) || 0, notes: form.notes };
    // keep items as is for now — full edit of items via add page clone can be added later; here we just save header
    const res = await fetch(`/api/messes/${id}/market/entries/${entryId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) setMsg(data.error);
    else {
      setMsg("Saved");
      setEditing(false);
      load();
    }
  }

  async function voidEntry() {
    if (!confirm("Void this entry?")) return;
    const res = await fetch(`/api/messes/${id}/market/entries/${entryId}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) setMsg(data.error);
    else {
      setMsg("Voided");
      load();
    }
  }

  if (!entry) return <div className="max-w-3xl mx-auto p-6 text-sm">{msg || "Loading..."}</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Link href={`/messes/${id}/market/entries`} className="text-sm text-zinc-500">← Entries</Link>
      <h1 className="text-lg font-bold">এন্ট্রি {entry.id.slice(0, 8)} — {formatDateBD(entry.date, locale)}</h1>
      <div className="bg-white border rounded-2xl p-4 space-y-2 text-sm">
        <div className="flex justify-between"><span>তারিখ (DD-MM-YYYY)</span><span className="font-mono">{formatDateBD(entry.date, locale)}</span></div>
        <div className="flex justify-between"><span>কে বাজার করেছে</span><span className="font-medium">{(entry as unknown as { purchaserName: string | null }).purchaserName || "—"}</span></div>
        <div className="flex justify-between"><span>অবস্থা</span><span className={`rounded-full px-2 py-0.5 text-xs ${entry.status === "active" ? "bg-green-100" : "bg-zinc-200"}`}>{entry.status}</span></div>
        <div className="flex justify-between"><span>মোট</span><span>{formatCurrency(entry.totalPaisa, locale)}</span></div>
        <div className="flex justify-between"><span>গাড়ি ভাড়া</span><span>{formatCurrency(entry.transportPaisa || 0, locale)}</span></div>
        <div className="flex justify-between"><span>ছাড়</span><span>{formatCurrency(entry.discountPaisa, locale)}</span></div>
        <div className="flex justify-between font-semibold"><span>সর্বমোট (মোট + গাড়ি - ছাড়)</span><span>{formatCurrency(entry.finalPaisa, locale)}</span></div>
        <div className="text-xs text-zinc-500">সংরক্ষণ: marketEntries ({entry.id}) + {items.length} items — ড্যাশবোর্ড/সেটেলমেন্ট/রিপোর্টে যায়</div>
      </div>

      <div className="bg-white border rounded-2xl p-4">
        <div className="font-medium text-sm mb-2">আইটেম ({items.length})</div>
        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.id} className="flex justify-between border rounded-lg px-3 py-2 text-sm bg-zinc-50">
              <span>{it.productNameSnapshot} {it.categoryNameSnapshot ? `(${it.categoryNameSnapshot})` : ""} — {(it.quantityScaled / 1000).toFixed(3).replace(/\.?0+$/, "")} {it.unit} × {formatCurrency(it.unitPricePaisa, locale)}</span>
              <span className="font-semibold">{formatCurrency(it.totalPaisa, locale)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-4 space-y-3">
        <div className="font-medium text-sm">Edit — ভবিষ্যতে পরিবর্তন</div>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="px-4 py-2 rounded-full border text-sm">Edit</button>
        ) : (
          <div className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div><label className="text-xs">তারিখ (DD-MM-YYYY)</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1" /><div className="text-[11px] text-zinc-500 mt-1">{form.date ? formatDateBD(form.date, locale) : ""}</div></div>
              <div><label className="text-xs">কে বাজার করেছে *</label><select value={form.purchasedBy} onChange={(e) => setForm({ ...form, purchasedBy: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1"><option value="">— বেছে নিন —</option>{members.map((m) => <option key={m.id} value={m.id}>{m.displayName}</option>)}</select></div>
              <div><label className="text-xs">শ্রেণি</label><select value={form.classification} onChange={(e) => setForm({ ...form, classification: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1"><option value="food">খাদ্য</option><option value="shared">যৌথ</option><option value="non_food">অখাদ্য</option></select></div>
              <div><label className="text-xs">পেমেন্ট</label><select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1"><option value="cash">নগদ (ক্যাশ)</option><option value="bank">ব্যাংক</option><option value="mobile">মোবাইল</option><option value="other">অন্যান্য</option></select></div>
              <div><label className="text-xs">গাড়ি ভাড়া (টাকা)</label><input type="number" step="0.01" value={form.transport} onChange={(e) => setForm({ ...form, transport: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1 border-amber-200" placeholder="যেমন ৪০" /></div>
              <div><label className="text-xs">ছাড় (টাকা)</label><input type="number" step="0.01" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1" /></div>
            </div>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="নোট" className="w-full border rounded-xl px-3 py-2 text-sm" rows={2} />
            <div className="flex gap-2">
              <button onClick={save} className="flex-1 rounded-full bg-zinc-900 text-white py-2.5 text-sm">Save</button>
              <button onClick={() => setEditing(false)} className="px-6 rounded-full border text-sm">Cancel</button>
            </div>
            <p className="text-xs text-zinc-500">Tip: আইটেম (পণ্য/পরিমাণ) বদলাতে নতুন এন্ট্রি তৈরি করে পুরনোটি Void করুন — পূর্ণ আইটেম Edit পরবর্তী আপডেটে</p>
          </div>
        )}
        {msg && <div className="rounded-xl border p-3 text-sm bg-white">{msg}</div>}
        <div className="flex gap-2 pt-2">
          <button onClick={voidEntry} className="px-4 py-2 rounded-full border text-sm text-red-600">Void (বাতিল)</button>
          <button onClick={() => router.push(`/messes/${id}/market/entries`)} className="px-4 py-2 rounded-full border text-sm">Back to list</button>
        </div>
      </div>
    </div>
  );
}
