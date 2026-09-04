"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Item = { productName: string; categoryName: string; quantity: string; unit: string; unitPrice: string };
const UNITS = ["kg", "gram", "litre", "ml", "piece", "dozen", "packet", "bottle", "box", "custom"];

export default function AddMarketPage() {
  const { id } = useParams<{ id: string }>();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [classification, setClassification] = useState("food");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [vendorId, setVendorId] = useState("");
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Item[]>([{ productName: "", categoryName: "", quantity: "1", unit: "kg", unitPrice: "0" }]);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/messes/${id}/market/vendors`).then((r) => r.json()).then((d) => { if (d.vendors) setVendors(d.vendors); });
  }, [id]);

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function addRow() { setItems((prev) => [...prev, { productName: "", categoryName: "", quantity: "1", unit: "kg", unitPrice: "0" }]); }
  function removeRow(idx: number) { setItems((prev) => prev.filter((_, i) => i !== idx)); }

  const total = items.reduce((a, it) => a + (parseFloat(it.quantity) || 0) * (parseFloat(it.unitPrice) || 0), 0);
  const discountNum = parseFloat(discount) || 0;
  const final = Math.max(0, total - discountNum);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`/api/messes/${id}/market/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          classification,
          paymentMethod,
          vendorId: vendorId || null,
          discount: discountNum,
          notes,
          items: items.map((it) => ({
            productName: it.productName,
            categoryName: it.categoryName,
            quantity: parseFloat(it.quantity) || 0,
            unit: it.unit,
            unitPrice: parseFloat(it.unitPrice) || 0,
          })),
          clientRefId: `cli-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || JSON.stringify(data));
      setMsg(`Saved! Entry ${data.entry.id} — Final ৳${(data.entry.finalPaisa / 100).toFixed(2)}`);
      setItems([{ productName: "", categoryName: "", quantity: "1", unit: "kg", unitPrice: "0" }]);
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Link href={`/messes/${id}/market`} className="text-sm text-zinc-500">← Market Hub</Link>
      <h1 className="text-lg font-bold">বাজার এন্ট্রি</h1>
      {msg && <div className="rounded-xl border p-3 text-sm bg-white break-all">{msg}</div>}
      <form onSubmit={submit} className="bg-white border rounded-2xl p-6 space-y-4">
        <div className="grid md:grid-cols-3 gap-3">
          <div><label className="text-xs">Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm mt-1" required /></div>
          <div><label className="text-xs">Classification</label><select value={classification} onChange={(e) => setClassification(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm mt-1"><option value="food">food</option><option value="shared">shared</option><option value="non_food">non_food</option></select></div>
          <div><label className="text-xs">Payment</label><select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm mt-1"><option value="cash">cash</option><option value="bank">bank</option><option value="mobile">mobile</option><option value="other">other</option></select></div>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div><label className="text-xs">Vendor</label><select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm mt-1"><option value="">— No vendor —</option>{vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
          <div><label className="text-xs">Discount (BDT)</label><input type="number" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm mt-1" /></div>
        </div>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" className="w-full border rounded-xl px-3 py-2 text-sm" rows={2} />

        <div className="space-y-3">
          <div className="flex items-center justify-between"><span className="font-medium text-sm">Items ({items.length})</span><button type="button" onClick={addRow} className="text-xs border rounded-full px-3 py-1">+ Add Row</button></div>
          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 border rounded-xl p-3 bg-zinc-50">
              <input placeholder="Product (e.g. Rice)" value={it.productName} onChange={(e) => updateItem(idx, { productName: e.target.value })} className="col-span-3 border rounded-lg px-2 py-2 text-sm" required />
              <input placeholder="Category" value={it.categoryName} onChange={(e) => updateItem(idx, { categoryName: e.target.value })} className="col-span-2 border rounded-lg px-2 py-2 text-sm" />
              <input type="number" step="0.01" placeholder="Qty" value={it.quantity} onChange={(e) => updateItem(idx, { quantity: e.target.value })} className="col-span-2 border rounded-lg px-2 py-2 text-sm text-center" required />
              <select value={it.unit} onChange={(e) => updateItem(idx, { unit: e.target.value })} className="col-span-2 border rounded-lg px-2 py-2 text-sm"><option disabled value="">Unit</option>{UNITS.map((u) => <option key={u} value={u}>{u}</option>)}</select>
              <input type="number" step="0.01" placeholder="Unit Price (BDT)" value={it.unitPrice} onChange={(e) => updateItem(idx, { unitPrice: e.target.value })} className="col-span-2 border rounded-lg px-2 py-2 text-sm text-center" required />
              <button type="button" onClick={() => removeRow(idx)} className="col-span-1 text-xs border rounded-lg bg-white">✕</button>
              <div className="col-span-12 text-xs text-zinc-500">Total: ৳{((parseFloat(it.quantity) || 0) * (parseFloat(it.unitPrice) || 0)).toFixed(2)} — {it.quantity} {it.unit} × ৳{it.unitPrice}</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-zinc-900 text-white p-4 flex justify-between text-sm">
          <span>Total: ৳{total.toFixed(2)} • Discount: ৳{discountNum.toFixed(2)}</span><span className="font-bold">Final: ৳{final.toFixed(2)}</span>
        </div>

        <button disabled={saving} className="w-full rounded-full bg-zinc-900 text-white py-3 text-sm font-medium disabled:opacity-50">{saving ? "Saving..." : "Save Purchase"}</button>
        <p className="text-xs text-zinc-500 text-center">Backend validates qty × price = total (paisa-safe). Idempotent via clientRefId.</p>
      </form>
    </div>
  );
}
