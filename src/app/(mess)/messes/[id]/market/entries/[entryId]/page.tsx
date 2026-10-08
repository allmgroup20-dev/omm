"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/i18n/provider";
import { formatCurrency, formatDateBD } from "@/i18n/dict";
import { buildMarketItemsPayload, previewItemsTotalBDT } from "@/lib/market-view";
import { useMyRole } from "@/hooks/useMyRole";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";

type Entry = { id: string; date: string; vendorId: string | null; classification: string; paymentMethod: string; totalPaisa: number; transportPaisa: number; discountPaisa: number; finalPaisa: number; notes: string | null; status: string };
type Item = { id: string; productNameSnapshot: string; categoryNameSnapshot: string | null; quantityScaled: number; unit: string; unitPricePaisa: number; totalPaisa: number };

type Row = {
  productSel: string;
  productName: string;
  categorySel: string;
  categoryName: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  total: string;
};
type Product = { id: string; name: string; categoryId: string | null; defaultUnit: string };
type Category = { id: string; name: string };
type Vendor = { id: string; name: string };

const UNIT_CODES = ["kg", "gram", "litre", "ml", "piece", "dozen", "packet", "bottle", "box", "custom"] as const;
const CUSTOM = "__custom__";
const EMPTY_ROW: Row = { productSel: CUSTOM, productName: "", categorySel: CUSTOM, categoryName: "", quantity: "1", unit: "kg", unitPrice: "0", total: "" };

export default function EntryDetailPage() {
  const { id, entryId } = useParams<{ id: string; entryId: string }>();
  const { t, locale } = useLocale();
  const router = useRouter();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [msg, setMsg] = useState("");
  const [closedPeriod, setClosedPeriod] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [voidConfirm, setVoidConfirm] = useState(false);
  const [voidBusy, setVoidBusy] = useState(false);
  const [form, setForm] = useState({ date: "", classification: "food", paymentMethod: "cash", discount: "0", transport: "0", purchasedBy: [] as string[], vendorId: "", notes: "" });
  const [editItems, setEditItems] = useState<Row[]>([]);
  const endOfRowsRef = useRef<HTMLDivElement>(null);
  const { canManage } = useMyRole(id);
  const [members, setMembers] = useState<{ id: string; displayName: string }[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  async function load() {
    const res = await fetch(`/api/messes/${id}/market/entries/${entryId}`);
    const data = await res.json();
    if (res.ok) {
      setEntry(data.entry);
      setItems(data.items);
      const pIds = (data.entry.purchaserIds as string[]) || (data.entry.purchasedBy ? [data.entry.purchasedBy] : []);
      setForm({ date: data.entry.date, classification: data.entry.classification, paymentMethod: data.entry.paymentMethod, discount: (data.entry.discountPaisa / 100).toString(), transport: ((data.entry.transportPaisa || 0) / 100).toString(), purchasedBy: pIds, vendorId: data.entry.vendorId || "", notes: data.entry.notes || "" });
      setEditItems(
        (data.items as Item[]).map((it) => ({
          productSel: CUSTOM,
          productName: it.productNameSnapshot,
          categorySel: CUSTOM,
          categoryName: it.categoryNameSnapshot || "",
          quantity: String(it.quantityScaled / 1000),
          unit: it.unit,
          unitPrice: String(it.unitPricePaisa / 100),
          total: String(it.totalPaisa / 100),
        })),
      );
      setClosedPeriod("");
    } else setMsg(data.error);
  }
  useEffect(() => {
    load();
    fetch(`/api/messes/${id}/members`).then((r) => r.json()).then((d) => {
      if (d.members) setMembers(d.members.filter((m: { status: string }) => m.status === "active").map((m: { id: string; fullName: string; displayName: string }) => ({ id: m.id, displayName: m.fullName || m.displayName })));
    }).catch(() => {});
    fetch(`/api/messes/${id}/market/vendors`).then((r) => r.json()).then((d) => { if (d.vendors) setVendors(d.vendors); }).catch(() => {});
    fetch(`/api/messes/${id}/market/categories`).then((r) => r.json()).then((d) => { if (d.categories) setCategories(d.categories); }).catch(() => {});
    fetch(`/api/messes/${id}/market/products`).then((r) => r.json()).then((d) => { if (d.products) setProducts(d.products); }).catch(() => {});
  }, [id, entryId]);

  function updateItem(idx: number, patch: Partial<Row>) {
    setEditItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function onQuantityChange(idx: number, val: string) {
    const qty = parseFloat(val) || 0;
    const totalStr = editItems[idx]?.total;
    if (totalStr) {
      const total = parseFloat(totalStr) || 0;
      if (qty > 0 && total > 0) {
        updateItem(idx, { quantity: val, unitPrice: (total / qty).toFixed(4).replace(/\.?0+$/, "") });
        return;
      }
    }
    updateItem(idx, { quantity: val });
  }
  function onUnitPriceChange(idx: number, val: string) {
    updateItem(idx, { unitPrice: val, total: "" });
  }
  function onTotalChange(idx: number, totalStr: string) {
    const total = parseFloat(totalStr) || 0;
    const qty = parseFloat(editItems[idx]?.quantity) || 0;
    if (!totalStr) {
      updateItem(idx, { total: "", unitPrice: "0" });
      return;
    }
    if (qty > 0) updateItem(idx, { total: totalStr, unitPrice: (total / qty).toFixed(4).replace(/\.?0+$/, "") });
    else updateItem(idx, { total: totalStr, unitPrice: totalStr });
  }
  function onKgChange(idx: number, kgStr: string, gramStr: string) {
    const qty = (parseFloat(kgStr) || 0) + (parseFloat(gramStr) || 0) / 1000;
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
    updateItem(idx, { productSel: sel, productName: p.name, categorySel: p.categoryId || "", categoryName: cat?.name || "", unit: p.defaultUnit || "kg" });
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
    setEditItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const keepProduct = it.productSel && it.productSel !== CUSTOM && products.some((p) => p.id === it.productSel && p.categoryId === sel);
        if (keepProduct) return { ...it, categorySel: sel, categoryName: c?.name || "" };
        return { ...it, categorySel: sel, categoryName: c?.name || "", productSel: "", productName: "", unit: "kg" };
      }),
    );
  }
  function addRow() {
    setEditItems((prev) => [...prev, { ...EMPTY_ROW }]);
    requestAnimationFrame(() => endOfRowsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  }
  function removeRow(idx: number) { setEditItems((prev) => prev.filter((_, i) => i !== idx)); }

  const previewTotal = previewItemsTotalBDT(editItems.map(({ productName, categoryName, quantity, unit, unitPrice, total }) => ({ productName, categoryName, quantity, unit, unitPrice, total })));
  const previewFinal = Math.max(0, previewTotal + (parseFloat(form.transport) || 0) - (parseFloat(form.discount) || 0));

  async function save() {
    setSaving(true);
    setMsg("");
    setClosedPeriod("");
    const payload: Record<string, unknown> = {
      date: form.date,
      purchasedBy: form.purchasedBy.length ? form.purchasedBy : undefined,
      classification: form.classification,
      paymentMethod: form.paymentMethod,
      vendorId: form.vendorId || null,
      discount: parseFloat(form.discount) || 0,
      transport: parseFloat(form.transport) || 0,
      notes: form.notes,
      items: buildMarketItemsPayload(editItems.map(({ productName, categoryName, quantity, unit, unitPrice, total }) => ({ productName, categoryName, quantity, unit, unitPrice, total }))),
    };
    const res = await fetch(`/api/messes/${id}/market/entries/${entryId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      if (data.code === "MONTH_CLOSED" && data.period) setClosedPeriod(data.period);
      setMsg(data.error || t("errors.saveFail"));
    } else {
      setMsg(t("market.savedMsg"));
      setEditing(false);
      load();
    }
  }

  async function voidEntry() {
    setVoidConfirm(true);
  }

  async function confirmVoid() {
    setVoidBusy(true);
    const res = await fetch(`/api/messes/${id}/market/entries/${entryId}`, { method: "DELETE" });
    const data = await res.json();
    setVoidBusy(false);
    if (!res.ok) setMsg(data.error);
    else {
      setVoidConfirm(false);
      router.replace(`/messes/${id}/market/entries`);
    }
  }

  if (!entry) return <div className="max-w-3xl mx-auto p-6 text-sm">{msg || "Loading..."}</div>;
  const isActive = entry.status === "active";

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Link href={`/messes/${id}/market/entries`} className="text-sm text-zinc-500">← {t("market.entriesTitle")}</Link>
      <h1 className="text-lg font-bold">{t("market.entryDetail")} — {formatDateBD(entry.date, locale)}</h1>
      {closedPeriod && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {t("finance.closedBanner")} <b>{closedPeriod}</b>{" "}
          <Link href={`/messes/${id}/settlements`} className="ml-1 underline font-medium">{t("finance.reopenLink")}</Link>
        </div>
      )}
      <div className="bg-white border rounded-2xl p-4 space-y-2 text-sm">
        <div className="flex justify-between"><span>তারিখ (DD-MM-YYYY)</span><span className="font-mono">{formatDateBD(entry.date, locale)}</span></div>
        <div className="flex justify-between"><span>কে বাজার করেছে</span><span className="font-medium">{((entry as unknown as { purchaserNames?: string[]; purchaserName: string | null }).purchaserNames?.length ? (entry as unknown as { purchaserNames: string[] }).purchaserNames.join(", ") : (entry as unknown as { purchaserName: string | null }).purchaserName) || "—"}</span></div>
        <div className="flex justify-between"><span>অবস্থা</span><span className={`rounded-full px-2 py-0.5 text-xs ${entry.status === "active" ? "bg-green-100" : "bg-zinc-200"}`}>{entry.status}</span></div>
        <div className="flex justify-between"><span>মোট</span><span>{formatCurrency(entry.totalPaisa, locale)}</span></div>
        <div className="flex justify-between"><span>গাড়ি ভাড়া</span><span>{formatCurrency(entry.transportPaisa || 0, locale)}</span></div>
        <div className="flex justify-between"><span>ছাড়</span><span>{formatCurrency(entry.discountPaisa, locale)}</span></div>
        <div className="flex justify-between font-semibold"><span>সর্বমোট (মোট + গাড়ি - ছাড়)</span><span>{formatCurrency(entry.finalPaisa, locale)}</span></div>
        <div className="text-xs text-zinc-500">সর্বমোট সেটেলমেন্ট ও রিপোর্টে যায়</div>
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
        <div className="font-medium text-sm">Edit — সব ফিল্ড</div>
        {!isActive && <div className="text-xs text-zinc-500">বাতিলকৃত এন্ট্রি এডিট করা যাবে না।</div>}
        {isActive && !canManage && <div className="text-xs text-zinc-500">শুধু ম্যানেজার এডিট করতে পারে — তথ্য দেখা যাবে।</div>}
        {isActive && canManage && !editing ? (
          <button onClick={() => setEditing(true)} className="px-4 py-2 rounded-full border text-sm min-h-[44px]">Edit</button>
        ) : isActive && canManage ? (
          <div className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div><label className="text-xs">তারিখ (DD-MM-YYYY)</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1" required /><div className="text-[11px] text-zinc-500 mt-1">{form.date ? formatDateBD(form.date, locale) : ""}</div></div>
              <div><label className="text-xs">কে বাজার করেছে * (একাধিক)</label><div className="border rounded-xl p-2 max-h-[120px] overflow-auto bg-white mt-1 space-y-1">{members.map((m) => <label key={m.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.purchasedBy.includes(m.id)} onChange={(e) => setForm({ ...form, purchasedBy: e.target.checked ? [...form.purchasedBy, m.id] : form.purchasedBy.filter((x) => x !== m.id) })} /><span>{m.displayName}</span></label>)} {members.length === 0 && <div className="text-xs text-zinc-500">কোনো সদস্য নেই</div>}</div></div>
              <div><label className="text-xs">{t("market.vendor")}</label><select value={form.vendorId} onChange={(e) => setForm({ ...form, vendorId: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1"><option value="">{t("market.noVendor")}</option>{vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
              <div><label className="text-xs">শ্রেণি</label><select value={form.classification} onChange={(e) => setForm({ ...form, classification: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1"><option value="food">খাদ্য</option><option value="shared">যৌথ</option><option value="non_food">অখাদ্য</option></select></div>
              <div><label className="text-xs">পেমেন্ট</label><select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1"><option value="cash">নগদ (ক্যাশ)</option><option value="bank">ব্যাংক</option><option value="mobile">মোবাইল</option><option value="other">অন্যান্য</option></select></div>
              <div><label className="text-xs">গাড়ি ভাড়া (টাকা)</label><input type="number" step="0.01" value={form.transport} onChange={(e) => setForm({ ...form, transport: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1 border-amber-200" placeholder="যেমন ৪০" /></div>
              <div><label className="text-xs">ছাড় (টাকা)</label><input type="number" step="0.01" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1" /></div>
            </div>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="নোট" className="w-full border rounded-xl px-3 py-2 text-sm" rows={2} />

              <div className="space-y-3 pt-1">
              <div className="font-medium text-sm">আইটেম ({editItems.length}) — দাম/পরিমাণ/পণ্য সব বদলানো যায়</div>
              {editItems.map((it, idx) => {
                const rowTotal = it.total ? parseFloat(it.total) || 0 : (parseFloat(it.quantity) || 0) * (parseFloat(it.unitPrice) || 0);
                return (
                  <div key={idx} className="border rounded-xl p-3 bg-zinc-50 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="min-w-0">
                        <label className="text-[11px] text-zinc-500">{t("market.category")}</label>
                        <select value={it.categorySel} onChange={(e) => onCategoryChange(idx, e.target.value)} className="w-full border rounded-lg px-3 py-2.5 text-sm bg-white font-medium min-w-0 truncate" title={it.categoryName}>
                          <option value="">{t("market.categoryPh")}</option>
                          {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
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
                          return (
                            <>
                              <select value={it.productSel} onChange={(e) => onProductChange(idx, e.target.value)} className="w-full border rounded-lg px-3 py-2.5 text-sm bg-white min-w-0 truncate" title={it.productName}>
                                <option value="">{t("market.productPh")}</option>
                                {filtered.map((p) => (<option key={p.id} value={p.id}>{p.name} ({(t(`units.${p.defaultUnit}` as never) as string) || p.defaultUnit})</option>))}
                                <option value={CUSTOM}>{t("market.newCustom")}</option>
                              </select>
                              {it.productSel === CUSTOM && (
                                <input placeholder={t("market.productCustomPh")} value={it.productName} onChange={(e) => updateItem(idx, { productName: e.target.value })} className="w-full border rounded-lg px-3 py-2.5 text-sm mt-2 bg-white" />
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
                      <div>
                        <label className="text-[11px] text-zinc-500">{t("market.quantity")} {it.unit === "kg" ? "(কেজি + গ্রাম)" : ""}</label>
                        {it.unit === "kg" ? (
                          <div className="flex gap-1">
                            {(() => {
                              const q = parseFloat(it.quantity) || 0;
                              const kg = Math.floor(q);
                              const g = Math.round((q - kg) * 1000);
                              return (
                                <>
                                  <input type="number" min={0} step={1} placeholder="কেজি" value={q ? String(kg) : it.quantity === "0" ? "0" : ""} onChange={(e) => onKgChange(idx, e.target.value, String(g))} className="w-1/2 border rounded-lg px-2 py-2.5 text-sm text-center bg-white" />
                                  <input type="number" min={0} max={999} step={1} placeholder="গ্রাম" value={q ? String(g) : ""} onChange={(e) => onKgChange(idx, String(kg), e.target.value)} className="w-1/2 border rounded-lg px-2 py-2.5 text-sm text-center bg-white" />
                                </>
                              );
                            })()}
                          </div>
                        ) : (
                          <input type="number" step="0.001" placeholder={t("market.quantity")} value={it.quantity} onChange={(e) => onQuantityChange(idx, e.target.value)} className="w-full border rounded-lg px-3 py-2.5 text-sm text-center bg-white" />
                        )}
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-500">{t("market.unit")}</label>
                        <select value={it.unit} onChange={(e) => updateItem(idx, { unit: e.target.value })} className="w-full border rounded-lg px-3 py-2.5 text-sm bg-white truncate min-h-[44px]">
                          {UNIT_CODES.map((u) => (<option key={u} value={u}>{t(`units.${u}`)}</option>))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-500">{t("market.unitPrice")}</label>
                        <input type="number" step="0.0001" placeholder={t("market.unitPrice")} value={it.unitPrice} onChange={(e) => onUnitPriceChange(idx, e.target.value)} className="w-full border rounded-lg px-3 py-2.5 text-sm text-center bg-white min-h-[44px]" />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-500">মোট (টাকা)</label>
                        <input type="number" step="0.01" placeholder="যেমন ২৪৬০" value={it.total !== "" ? it.total : rowTotal ? rowTotal.toFixed(2).replace(/\.00$/, "") : ""} onChange={(e) => onTotalChange(idx, e.target.value)} className="w-full border rounded-lg px-3 py-2.5 text-sm text-center bg-white border-amber-300" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">{t("market.total")}: {formatCurrency(Math.round((it.total ? parseFloat(it.total) || 0 : rowTotal) * 100), locale)}</span>
                      <button type="button" onClick={() => removeRow(idx)} className="text-xs border rounded-lg bg-white px-4 py-2 min-h-[40px]">{t("market.remove")}</button>
                    </div>
                  </div>
                );
              })}
              <div ref={endOfRowsRef} />
              <button type="button" onClick={addRow} className="w-full border-2 border-dashed rounded-xl py-3 text-sm bg-white text-zinc-700 font-medium min-h-[48px]">{t("market.addRow")}</button>
            </div>

            <div className="rounded-xl bg-zinc-900 text-white p-4 flex flex-wrap justify-between gap-2 text-sm">
              <span>{t("market.total")}: {formatCurrency(Math.round(previewTotal * 100), locale)} + {t("market.gariVara")}: {formatCurrency(Math.round((parseFloat(form.transport) || 0) * 100), locale)} - {t("market.discount")}: {formatCurrency(Math.round((parseFloat(form.discount) || 0) * 100), locale)}</span><span className="font-bold">{t("market.final")}: {formatCurrency(Math.round(previewFinal * 100), locale)}</span>
            </div>

            <div className="flex gap-2">
              <button onClick={save} disabled={saving} className="flex-1 rounded-full bg-zinc-900 text-white py-2.5 text-sm disabled:opacity-50">{saving ? t("market.saving") : "Save"}</button>
              <button onClick={() => setEditing(false)} className="px-6 rounded-full border text-sm">Cancel</button>
            </div>
          </div>
        ) : null}
        {msg && <div className="rounded-xl border p-3 text-sm bg-white break-all">{msg}</div>}
        <div className="flex gap-2 pt-2">
          {isActive && canManage && <button onClick={voidEntry} className="px-4 py-2 rounded-full border text-sm text-red-600 min-h-[44px]">Delete (স্থায়ীভাবে মুছুন)</button>}
          <button onClick={() => router.push(`/messes/${id}/market/entries`)} className="px-4 py-2 rounded-full border text-sm min-h-[44px]">Back to list</button>
        </div>
      </div>
      <ConfirmSheet
        open={voidConfirm}
        title="এই এন্ট্রি স্থায়ীভাবে মুছবেন? মোট ও বিক্রেতার হিসাব থেকে বাদ যাবে।"
        confirmLabel="স্থায়ীভাবে মুছুন"
        danger
        busy={voidBusy}
        onConfirm={confirmVoid}
        onClose={() => !voidBusy && setVoidConfirm(false)}
      />
    </div>
  );
}
