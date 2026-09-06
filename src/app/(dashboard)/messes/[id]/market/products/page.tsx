"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/i18n/provider";

type Cat = { id: string; name: string };
type Prod = { id: string; name: string; slug: string; categoryId: string | null; defaultUnit: string; isArchived: boolean; sortOrder: number };

const UNIT_CODES = ["kg", "gram", "litre", "ml", "piece", "dozen", "packet", "bottle", "box", "custom"] as const;

export default function ProductsPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLocale();
  const [cats, setCats] = useState<Cat[]>([]);
  const [prods, setProds] = useState<Prod[]>([]);
  const [name, setName] = useState("");
  const [catId, setCatId] = useState("");
  const [unit, setUnit] = useState("kg");
  const [sortOrder, setSortOrder] = useState("0");
  const [editing, setEditing] = useState<Prod | null>(null);
  const [editName, setEditName] = useState("");
  const [editCatId, setEditCatId] = useState("");
  const [editUnit, setEditUnit] = useState("kg");
  const [editSort, setEditSort] = useState("0");
  const [msg, setMsg] = useState("");

  async function load() {
    const [cRes, pRes] = await Promise.all([fetch(`/api/messes/${id}/market/categories`), fetch(`/api/messes/${id}/market/products`)]);
    const cData = await cRes.json();
    const pData = await pRes.json();
    if (cRes.ok) setCats(cData.categories);
    if (pRes.ok) setProds(pData.products);
    if (cats.length && !catId) setCatId(cData.categories[0]?.id || "");
  }
  useEffect(() => { load(); }, [id]);

  async function add() {
    const res = await fetch(`/api/messes/${id}/market/products`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, categoryId: catId, defaultUnit: unit, sortOrder: parseInt(sortOrder) || 0 }) });
    const data = await res.json();
    if (!res.ok) setMsg(data.error);
    else {
      setMsg(`${t("common.success")} — ${data.product.name}`);
      setName("");
      setSortOrder("0");
      load();
    }
  }

  function startEdit(p: Prod) {
    setEditing(p);
    setEditName(p.name);
    setEditCatId(p.categoryId || "");
    setEditUnit(p.defaultUnit);
    setEditSort(String(p.sortOrder ?? 0));
  }

  async function saveEdit() {
    if (!editing) return;
    const res = await fetch(`/api/messes/${id}/market/products/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editName, categoryId: editCatId, defaultUnit: editUnit, sortOrder: parseInt(editSort) || 0 }) });
    const data = await res.json();
    if (!res.ok) setMsg(data.error);
    else {
      setMsg(`${t("common.success")} — ${data.product.name}`);
      setEditing(null);
      load();
    }
  }

  async function del(pid: string) {
    if (!confirm("Delete product?")) return;
    const res = await fetch(`/api/messes/${id}/market/products/${pid}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setMsg(data.error || "Delete failed");
    else {
      setMsg(data.archived ? "Archived (used in entries)" : t("common.success"));
      load();
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link href={`/messes/${id}/market`} className="text-sm text-zinc-500">← {t("market.hub")}</Link>
      <h1 className="text-lg font-bold">{t("market.prodTitle")}</h1>
      <p className="text-xs text-zinc-500">{t("market.prodDesc")}</p>
      {msg && <div className="rounded-xl border p-3 text-sm bg-white">{msg}</div>}
      <div className="bg-white border rounded-2xl p-5 space-y-3">
        <div className="grid grid-cols-12 gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("market.prodNamePh")} className="col-span-4 border rounded-full px-4 py-2 text-sm" />
          <select value={catId} onChange={(e) => setCatId(e.target.value)} className="col-span-3 border rounded-full px-3 py-2 text-sm">
            <option value="">— {t("market.category")} —</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={unit} onChange={(e) => setUnit(e.target.value)} className="col-span-2 border rounded-full px-3 py-2 text-sm">
            {UNIT_CODES.map((u) => <option key={u} value={u}>{t(`units.${u}`)}</option>)}
          </select>
          <input type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="col-span-1 border rounded-full px-2 py-2 text-sm" placeholder="#" title="Serial" />
          <button onClick={add} className="col-span-2 px-2 py-2 rounded-full bg-zinc-900 text-white text-sm">{t("common.add")}</button>
        </div>
        <p className="text-xs text-zinc-500">সিরিয়াল দিয়ে সাজান — ছোট সংখ্যা আগে, যেকোনো ক্যাটাগরির অধীনে নতুন পণ্য যোগ হবে</p>
        <div className="space-y-1 max-h-[500px] overflow-auto">
          {prods
            .slice()
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
            .map((p) => (
              <div key={p.id} className="flex items-center gap-2 border rounded-lg px-3 py-2 text-sm bg-white">
                <span className="text-xs bg-amber-100 rounded-full px-2 py-0.5">#{p.sortOrder ?? 0}</span>
                <span className="flex-1 truncate">
                  {p.name} <span className="text-xs text-zinc-500">({t(`units.${p.defaultUnit}`)})</span> {p.isArchived && <span className="text-xs bg-zinc-200 rounded-full px-2">archived</span>}
                </span>
                <span className="text-xs text-zinc-500 truncate">{cats.find((c) => c.id === p.categoryId)?.name || "—"}</span>
                <button onClick={() => startEdit(p)} className="text-xs border rounded-full px-3 py-1 hover:bg-zinc-50">{t("common.edit")}</button>
                <button onClick={() => del(p.id)} className="text-xs border rounded-full px-3 py-1 hover:bg-red-50 text-red-600">{t("common.delete")}</button>
              </div>
            ))}
          {prods.length === 0 && <div className="text-center text-sm text-zinc-500 py-4">{t("market.noProducts")}</div>}
        </div>
      </div>

      {editing && (
        <div className="bg-white border rounded-2xl p-5 space-y-3">
          <div className="font-medium text-sm">Edit — {editing.name}</div>
          <div className="grid grid-cols-12 gap-2">
            <input value={editName} onChange={(e) => setEditName(e.target.value)} className="col-span-4 border rounded-full px-4 py-2 text-sm" />
            <select value={editCatId} onChange={(e) => setEditCatId(e.target.value)} className="col-span-3 border rounded-full px-3 py-2 text-sm">
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={editUnit} onChange={(e) => setEditUnit(e.target.value)} className="col-span-2 border rounded-full px-3 py-2 text-sm">
              {UNIT_CODES.map((u) => <option key={u} value={u}>{t(`units.${u}`)}</option>)}
            </select>
            <input type="number" min={0} value={editSort} onChange={(e) => setEditSort(e.target.value)} className="col-span-1 border rounded-full px-2 py-2 text-sm" />
            <button onClick={saveEdit} className="col-span-1 px-3 py-2 rounded-full bg-zinc-900 text-white text-sm">{t("common.save")}</button>
            <button onClick={() => setEditing(null)} className="col-span-1 px-3 py-2 rounded-full border text-sm">{t("common.cancel")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
