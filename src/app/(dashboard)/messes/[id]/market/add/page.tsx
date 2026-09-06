"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/i18n/provider";
import { formatCurrency } from "@/i18n/dict";

type Row = {
  productSel: string; // product id | "custom" | ""
  productName: string;
  categorySel: string; // category id | "custom" | ""
  categoryName: string;
  quantity: string;
  unit: string;
  unitPrice: string;
};

type Product = { id: string; name: string; categoryId: string | null; defaultUnit: string };
type Category = { id: string; name: string };
type Vendor = { id: string; name: string };

const UNIT_CODES = ["kg", "gram", "litre", "ml", "piece", "dozen", "packet", "bottle", "box", "custom"] as const;
const CUSTOM = "__custom__";

const EMPTY_ROW: Row = { productSel: "", productName: "", categorySel: "", categoryName: "", quantity: "1", unit: "kg", unitPrice: "0" };

export default function AddMarketPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useLocale();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [classification, setClassification] = useState("food");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [vendorId, setVendorId] = useState("");
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Row[]>([{ ...EMPTY_ROW }]);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/messes/${id}/market/vendors`).then((r) => r.json()).then((d) => { if (d.vendors) setVendors(d.vendors); }).catch(() => {});
    fetch(`/api/messes/${id}/market/categories`).then((r) => r.json()).then((d) => { if (d.categories) setCategories(d.categories); }).catch(() => {});
    fetch(`/api/messes/${id}/market/products`).then((r) => r.json()).then((d) => { if (d.products) setProducts(d.products); }).catch(() => {});
  }, [id]);

  function updateItem(idx: number, patch: Partial<Row>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function onProductChange(idx: number, sel: string) {
    if (sel === CUSTOM) {
      updateItem(idx, { productSel: sel, productName: "" });
      return;
    }
    const p = products.find((x) => x.id === sel);
    if (!p) {
      updateItem(idx, { productSel: sel, productName: "" });
      return;
    }
    const cat = categories.find((c) => c.id === p.categoryId);
    updateItem(idx, {
      productSel: sel,
      productName: p.name,
      categorySel: p.categoryId || "",
      categoryName: cat?.name || "",
      unit: p.defaultUnit || "kg",
    });
  }

  function onCategoryChange(idx: number, sel: string) {
    if (sel === CUSTOM) {
      updateItem(idx, { categorySel: sel, categoryName: "" });
      return;
    }
    const c = categories.find((x) => x.id === sel);
    updateItem(idx, { categorySel: sel, categoryName: c?.name || "" });
  }

  function addRow() { setItems((prev) => [...prev, { ...EMPTY_ROW }]); }
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
      setMsg(`${t("market.savedMsg")} ${formatCurrency(data.entry.finalPaisa, locale)}`);
      setItems([{ ...EMPTY_ROW }]);
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : t("errors.saveFail"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Link href={`/messes/${id}/market`} className="text-sm text-zinc-500">← {t("market.hub")}</Link>
      <h1 className="text-lg font-bold">{t("market.addEntry")}</h1>
      {msg && <div className="rounded-xl border p-3 text-sm bg-white break-all">{msg}</div>}
      <form onSubmit={submit} className="bg-white border rounded-2xl p-6 space-y-4">
        <div className="grid md:grid-cols-3 gap-3">
          <div><label className="text-xs">{t("market.date")}</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm mt-1" required /></div>
          <div><label className="text-xs">{t("market.classification")}</label><select value={classification} onChange={(e) => setClassification(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm mt-1"><option value="food">{t("market.classFood")}</option><option value="shared">{t("market.classShared")}</option><option value="non_food">{t("market.classNonFood")}</option></select></div>
          <div><label className="text-xs">{t("market.payment")}</label><select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm mt-1"><option value="cash">{t("market.payCash")}</option><option value="bank">{t("market.payBank")}</option><option value="mobile">{t("market.payMobile")}</option><option value="other">{t("market.payOther")}</option></select></div>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div><label className="text-xs">{t("market.vendor")}</label><select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm mt-1"><option value="">{t("market.noVendor")}</option>{vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
          <div><label className="text-xs">{t("market.discount")}</label><input type="number" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm mt-1" /></div>
        </div>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("market.notesPh")} className="w-full border rounded-xl px-3 py-2 text-sm" rows={2} />

        <div className="space-y-3">
          <div className="flex items-center justify-between"><span className="font-medium text-sm">{t("market.items")} ({items.length})</span><button type="button" onClick={addRow} className="text-xs border rounded-full px-3 py-1">{t("market.addRow")}</button></div>
          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 border rounded-xl p-3 bg-zinc-50">
              <div className="col-span-6 md:col-span-3">
                <select value={it.productSel} onChange={(e) => onProductChange(idx, e.target.value)} className="w-full border rounded-lg px-2 py-2 text-sm bg-white" required={it.productSel !== CUSTOM}>
                  <option value="">{t("market.productPh")}</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  <option value={CUSTOM}>{t("market.newCustom")}</option>
                </select>
                {it.productSel === CUSTOM && (
                  <input placeholder={t("market.productCustomPh")} value={it.productName} onChange={(e) => updateItem(idx, { productName: e.target.value })} className="w-full border rounded-lg px-2 py-2 text-sm mt-1 bg-white" required />
                )}
              </div>
              <div className="col-span-6 md:col-span-2">
                <select value={it.categorySel} onChange={(e) => onCategoryChange(idx, e.target.value)} className="w-full border rounded-lg px-2 py-2 text-sm bg-white">
                  <option value="">{t("market.categoryPh")}</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  <option value={CUSTOM}>{t("market.newCustom")}</option>
                </select>
                {it.categorySel === CUSTOM && (
                  <input placeholder={t("market.category")} value={it.categoryName} onChange={(e) => updateItem(idx, { categoryName: e.target.value })} className="w-full border rounded-lg px-2 py-2 text-sm mt-1 bg-white" />
                )}
              </div>
              <input type="number" step="0.01" placeholder={t("market.quantity")} value={it.quantity} onChange={(e) => updateItem(idx, { quantity: e.target.value })} className="col-span-4 md:col-span-2 border rounded-lg px-2 py-2 text-sm text-center bg-white" required />
              <select value={it.unit} onChange={(e) => updateItem(idx, { unit: e.target.value })} className="col-span-4 md:col-span-2 border rounded-lg px-2 py-2 text-sm bg-white">{UNIT_CODES.map((u) => <option key={u} value={u}>{t(`units.${u}`)}</option>)}</select>
              <input type="number" step="0.01" placeholder={t("market.unitPrice")} value={it.unitPrice} onChange={(e) => updateItem(idx, { unitPrice: e.target.value })} className="col-span-3 md:col-span-2 border rounded-lg px-2 py-2 text-sm text-center bg-white" required />
              <button type="button" onClick={() => removeRow(idx)} className="col-span-1 text-xs border rounded-lg bg-white">{t("market.remove")}</button>
              <div className="col-span-12 text-xs text-zinc-500">{t("market.total")}: {formatCurrency(Math.round((parseFloat(it.quantity) || 0) * (parseFloat(it.unitPrice) || 0) * 100), locale)}</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-zinc-900 text-white p-4 flex justify-between text-sm">
          <span>{t("market.total")}: {formatCurrency(Math.round(total * 100), locale)} • {t("market.discount")}: {formatCurrency(Math.round(discountNum * 100), locale)}</span><span className="font-bold">{t("market.final")}: {formatCurrency(Math.round(final * 100), locale)}</span>
        </div>

        <button disabled={saving} className="w-full rounded-full bg-zinc-900 text-white py-3 text-sm font-medium disabled:opacity-50">{saving ? t("market.saving") : t("market.saveBtn")}</button>
        <p className="text-xs text-zinc-500 text-center">{t("market.backendNote")}</p>
      </form>
    </div>
  );
}
