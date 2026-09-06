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
  quantity: string; // e.g. "42.560" — for kg, 42kg 560g = 42.560
  unit: string;
  unitPrice: string;
  total: string; // exact pasted total, e.g. "2460" — wins over qty*price when present
};

type Product = { id: string; name: string; categoryId: string | null; defaultUnit: string };
type Category = { id: string; name: string };
type Vendor = { id: string; name: string };

const UNIT_CODES = ["kg", "gram", "litre", "ml", "piece", "dozen", "packet", "bottle", "box", "custom"] as const;
const CUSTOM = "__custom__";

const EMPTY_ROW: Row = { productSel: "", productName: "", categorySel: "", categoryName: "", quantity: "1", unit: "kg", unitPrice: "0", total: "" };

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

  function onQuantityChange(idx: number, val: string) {
    // keep total in sync when qty changes if total was pasted — recompute unitPrice from total/qty to keep 2460 exact
    const qty = parseFloat(val) || 0;
    const totalStr = items[idx]?.total;
    if (totalStr) {
      const total = parseFloat(totalStr) || 0;
      if (qty > 0 && total > 0) {
        const up = total / qty;
        updateItem(idx, { quantity: val, unitPrice: up.toFixed(4).replace(/\.?0+$/, "") });
        return;
      }
    }
    updateItem(idx, { quantity: val });
  }

  function onUnitPriceChange(idx: number, val: string) {
    // when unitPrice typed, clear total so qty*price wins (avoid stale total)
    updateItem(idx, { unitPrice: val, total: "" });
  }

  function onTotalChange(idx: number, totalStr: string) {
    // user pasted exact total (e.g. 2460) — preserve it, derive unitPrice without 2-dec truncation drift
    const total = parseFloat(totalStr) || 0;
    const qty = parseFloat(items[idx]?.quantity) || 0;
    if (!totalStr) {
      updateItem(idx, { total: "", unitPrice: "0" });
      return;
    }
    if (qty > 0) {
      const unitPrice = total / qty;
      updateItem(idx, { total: totalStr, unitPrice: unitPrice.toFixed(4).replace(/\.?0+$/, "") });
    } else {
      updateItem(idx, { total: totalStr, unitPrice: totalStr });
    }
  }

  function onKgChange(idx: number, kgStr: string, gramStr: string) {
    const kg = parseFloat(kgStr) || 0;
    const g = parseFloat(gramStr) || 0;
    const qty = kg + g / 1000;
    // keep 3-dec for kg+gram case (42.560)
    onQuantityChange(idx, qty ? qty.toFixed(3).replace(/\.?0+$/, "") : "0");
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
      updateItem(idx, { categorySel: sel, categoryName: "", productSel: CUSTOM, productName: "" });
      return;
    }
    if (!sel) {
      updateItem(idx, { categorySel: "", categoryName: "", productSel: "", productName: "", unit: "kg" });
      return;
    }
    const c = categories.find((x) => x.id === sel);
    // reset product if it doesn't belong to new category
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const keepProduct = it.productSel && it.productSel !== CUSTOM && products.some((p) => p.id === it.productSel && p.categoryId === sel);
        if (keepProduct) return { ...it, categorySel: sel, categoryName: c?.name || "" };
        return { ...it, categorySel: sel, categoryName: c?.name || "", productSel: "", productName: "", unit: "kg" };
      }),
    );
  }

  function addRow() { setItems((prev) => [...prev, { ...EMPTY_ROW }]); }
  function removeRow(idx: number) { setItems((prev) => prev.filter((_, i) => i !== idx)); }

  const total = items.reduce((a, it) => a + (it.total ? parseFloat(it.total) || 0 : (parseFloat(it.quantity) || 0) * (parseFloat(it.unitPrice) || 0)), 0);
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
            total: it.total ? parseFloat(it.total) || 0 : undefined,
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
    <div className="max-w-4xl mx-auto space-y-4">
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
           {items.map((it, idx) => {
            const rowTotal = it.total ? parseFloat(it.total) || 0 : (parseFloat(it.quantity) || 0) * (parseFloat(it.unitPrice) || 0);
            return (
              <div key={idx} className="border rounded-xl p-4 bg-zinc-50 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <label className="text-[11px] text-zinc-500">{t("market.category")}</label>
                    <select value={it.categorySel} onChange={(e) => onCategoryChange(idx, e.target.value)} className="w-full border rounded-lg px-3 py-2.5 text-sm bg-white font-medium min-w-0 truncate" title={it.categoryName}>
                      <option value="">{t("market.categoryPh")}</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                      <option value={CUSTOM}>{t("market.newCustom")}</option>
                    </select>
                    {it.categorySel === CUSTOM && (
                      <input placeholder={t("market.category")} value={it.categoryName} onChange={(e) => updateItem(idx, { categoryName: e.target.value })} className="w-full border rounded-lg px-3 py-2.5 text-sm mt-2 bg-white" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <label className="text-[11px] text-zinc-500">{t("market.product")}</label>
                    {(() => {
                      const filtered = it.categorySel && it.categorySel !== CUSTOM ? products.filter((p) => p.categoryId === it.categorySel) : [];
                      const isDisabled = !it.categorySel || it.categorySel === CUSTOM;
                      return (
                        <>
                          <select
                            value={it.productSel}
                            onChange={(e) => onProductChange(idx, e.target.value)}
                            className="w-full border rounded-lg px-3 py-2.5 text-sm bg-white disabled:bg-zinc-100 disabled:text-zinc-400 min-w-0 truncate"
                            title={it.productName}
                            required={!!it.categorySel && it.categorySel !== CUSTOM && it.productSel !== CUSTOM}
                            disabled={isDisabled && it.categorySel !== CUSTOM}
                          >
                            <option value="">{isDisabled ? (it.categorySel === CUSTOM ? t("market.productCustomPh") : "— " + t("market.categoryPh") + " আগে —") : t("market.productPh")}</option>
                            {filtered.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({t(`units.${p.defaultUnit}` as never) || p.defaultUnit})
                              </option>
                            ))}
                            <option value={CUSTOM}>{t("market.newCustom")}</option>
                          </select>
                          {filtered.length > 0 && it.categorySel !== CUSTOM && <div className="text-[11px] text-zinc-500 mt-1">{filtered.length}টি পণ্য</div>}
                          {it.productSel === CUSTOM && (
                            <input
                              placeholder={t("market.productCustomPh")}
                              value={it.productName}
                              onChange={(e) => updateItem(idx, { productName: e.target.value })}
                              className="w-full border rounded-lg px-3 py-2.5 text-sm mt-2 bg-white"
                              required
                            />
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-6 md:col-span-3">
                    <label className="text-[11px] text-zinc-500">{t("market.quantity")} {it.unit === "kg" ? "(কেজি + গ্রাম)" : ""}</label>
                    {it.unit === "kg" ? (
                      <div className="flex gap-1">
                        {(() => {
                          const q = parseFloat(it.quantity) || 0;
                          const kg = Math.floor(q);
                          const g = Math.round((q - kg) * 1000);
                          return (
                            <>
                              <input
                                type="number"
                                min={0}
                                step={1}
                                placeholder="কেজি"
                                value={q ? String(kg) : it.quantity === "0" ? "0" : ""}
                                onChange={(e) => onKgChange(idx, e.target.value, String(g))}
                                className="w-1/2 border rounded-lg px-2 py-2.5 text-sm text-center bg-white"
                                required
                              />
                              <input
                                type="number"
                                min={0}
                                max={999}
                                step={1}
                                placeholder="গ্রাম"
                                value={q ? String(g) : ""}
                                onChange={(e) => onKgChange(idx, String(kg), e.target.value)}
                                className="w-1/2 border rounded-lg px-2 py-2.5 text-sm text-center bg-white"
                              />
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <input type="number" step="0.001" placeholder={t("market.quantity")} value={it.quantity} onChange={(e) => onQuantityChange(idx, e.target.value)} className="w-full border rounded-lg px-3 py-2.5 text-sm text-center bg-white" required />
                    )}
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <label className="text-[11px] text-zinc-500">{t("market.unit")}</label>
                    <select value={it.unit} onChange={(e) => updateItem(idx, { unit: e.target.value })} className="w-full border rounded-lg px-3 py-2.5 text-sm bg-white min-w-[110px] truncate">
                      {UNIT_CODES.map((u) => (
                        <option key={u} value={u}>
                          {t(`units.${u}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-6 md:col-span-3">
                    <label className="text-[11px] text-zinc-500">{t("market.unitPrice")}</label>
                    <input type="number" step="0.0001" placeholder={t("market.unitPrice")} value={it.unitPrice} onChange={(e) => onUnitPriceChange(idx, e.target.value)} className="w-full border rounded-lg px-3 py-2.5 text-sm text-center bg-white" required />
                  </div>
                  <div className="col-span-6 md:col-span-3">
                    <label className="text-[11px] text-zinc-500">মোট (টাকা) — কপি-পেস্ট exact</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="যেমন ২৪৬০"
                      value={it.total !== "" ? it.total : rowTotal ? rowTotal.toFixed(2).replace(/\.00$/, "") : ""}
                      onChange={(e) => onTotalChange(idx, e.target.value)}
                      className="w-full border rounded-lg px-3 py-2.5 text-sm text-center bg-white border-amber-300 focus:border-amber-500"
                      title="২৪৬০ পেস্ট করলে ৫৬/৫৭ drift ছাড়া exact থাকবে"
                    />
                  </div>
                  <div className="col-span-12 md:col-span-1 flex justify-end">
                    <button type="button" onClick={() => removeRow(idx)} className="w-full md:w-auto text-xs border rounded-lg bg-white px-3 py-2.5">
                      {t("market.remove")}
                    </button>
                  </div>
                </div>
                <div className="text-xs text-zinc-500 text-right">
                  {t("market.total")}: {formatCurrency(Math.round((it.total ? parseFloat(it.total) || 0 : rowTotal) * 100), locale)}{" "}
                  {rowTotal > 0 && <span className="text-zinc-400">({it.quantity} × {it.unitPrice} {it.total ? "= " + it.total + " exact" : ""})</span>}
                </div>
              </div>
            );
          })}
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
