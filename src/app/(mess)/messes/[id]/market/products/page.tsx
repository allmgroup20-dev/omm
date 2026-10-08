"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/i18n/provider";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";

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
  const [delTarget, setDelTarget] = useState<string | null>(null);
  const [delBusy, setDelBusy] = useState(false);

  async function load() {
    const [cRes, pRes] = await Promise.all([fetch(`/api/messes/${id}/market/categories`), fetch(`/api/messes/${id}/market/products`)]);
    const cData = await cRes.json();
    const pData = await pRes.json();
    if (cRes.ok) {
      setCats(cData.categories);
      if (!catId && cData.categories?.length) setCatId(cData.categories[0].id);
    }
    if (pRes.ok) setProds(pData.products);
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
    setTimeout(() => document.getElementById("prod-edit-name")?.focus(), 50);
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
    setDelTarget(pid);
  }

  async function confirmDelete() {
    if (!delTarget) return;
    setDelBusy(true);
    const res = await fetch(`/api/messes/${id}/market/products/${delTarget}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setDelBusy(false);
    if (!res.ok) setMsg(typeof data.error === "string" && data.error ? data.error : t("market.deleteFail"));
    else {
      setMsg(data.archived ? t("market.archivedUsedMsg") : t("common.success"));
      setDelTarget(null);
      load();
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link href={`/messes/${id}/market/add`} className="text-sm text-zinc-500">← {t("market.addEntry")}</Link>
      <h1 className="text-lg font-bold">{t("market.prodTitle")}</h1>
      <p className="text-xs text-zinc-500">{t("market.prodDesc")}</p>
      {msg && <div className="rounded-xl border p-3 text-sm bg-white">{msg}</div>}
      <div className="bg-white border rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("market.prodNamePh")} aria-label={t("market.prodNamePh")} className="col-span-full sm:col-span-4 border rounded-xl px-4 py-3 text-base sm:text-sm min-h-[48px]" />
          <select value={catId} onChange={(e) => setCatId(e.target.value)} className="col-span-full sm:col-span-3 border rounded-xl px-3 py-3 text-base sm:text-sm min-h-[48px] bg-white" aria-label={t("market.category")}>
            <option value="">— {t("market.category")} —</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={unit} onChange={(e) => setUnit(e.target.value)} className="col-span-full sm:col-span-2 border rounded-xl px-3 py-3 text-base sm:text-sm min-h-[48px] bg-white" aria-label={t("market.unit")}>
            {UNIT_CODES.map((u) => <option key={u} value={u}>{t(`units.${u}`)}</option>)}
          </select>
          <input type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="col-span-full sm:col-span-1 border rounded-xl px-3 py-3 text-base sm:text-sm min-h-[48px]" placeholder={t("market.sortPh")} title={t("market.sortHint")} aria-label={t("market.sortPh")} />
          <button onClick={add} className="col-span-full sm:col-span-2 px-4 py-3 rounded-xl bg-zinc-900 text-white text-sm min-h-[48px]">{t("common.add")}</button>
        </div>
        <p className="text-xs text-zinc-500">{t("market.prodSortHint")}</p>
        <div className="space-y-1 max-h-[500px] overflow-auto">
          {prods
            .slice()
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
            .map((p) => (
              <div key={p.id} className="flex items-center gap-2 border rounded-lg px-3 py-2 text-sm bg-white overflow-hidden">
                <span className="flex-1 truncate min-w-0">
                  {p.name} <span className="text-xs text-zinc-500">({t(`units.${p.defaultUnit}`)})</span> {p.isArchived && <span className="text-xs bg-zinc-200 rounded-full px-2 py-0.5">{t("status.archived")}</span>}
                </span>
                <span className="text-xs text-zinc-500 truncate hidden sm:inline">{cats.find((c) => c.id === p.categoryId)?.name || "—"}</span>
                <button onClick={() => startEdit(p)} className="text-xs border rounded-full px-4 py-2.5 hover:bg-zinc-50 min-h-[44px] shrink-0">{t("common.edit")}</button>
                <button onClick={() => del(p.id)} className="text-xs border rounded-full px-4 py-2.5 hover:bg-red-50 text-red-600 min-h-[44px] shrink-0">{t("common.delete")}</button>
              </div>
            ))}
          {prods.length === 0 && <div className="text-center text-sm text-zinc-500 py-4">{t("market.noProducts")}</div>}
        </div>
      </div>

      {editing && (
        <div className="bg-white border rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="font-medium text-sm">{t("common.edit")} — {editing.name}</div>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <input id="prod-edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} aria-label={t("market.prodNamePh")} className="col-span-full sm:col-span-4 border rounded-xl px-4 py-3 text-base sm:text-sm min-h-[48px]" />
            <select value={editCatId} onChange={(e) => setEditCatId(e.target.value)} className="col-span-full sm:col-span-3 border rounded-xl px-3 py-3 text-base sm:text-sm min-h-[48px] bg-white" aria-label={t("market.category")}>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={editUnit} onChange={(e) => setEditUnit(e.target.value)} className="col-span-full sm:col-span-2 border rounded-xl px-3 py-3 text-base sm:text-sm min-h-[48px] bg-white" aria-label={t("market.unit")}>
              {UNIT_CODES.map((u) => <option key={u} value={u}>{t(`units.${u}`)}</option>)}
            </select>
            <input type="number" min={0} value={editSort} onChange={(e) => setEditSort(e.target.value)} className="col-span-full sm:col-span-1 border rounded-xl px-3 py-3 text-base sm:text-sm min-h-[48px]" placeholder={t("market.sortPh")} title={t("market.sortHint")} aria-label={t("market.sortPh")} />
            <div className="col-span-full sm:col-span-2 flex gap-2">
              <button onClick={saveEdit} className="flex-1 px-3 py-3 rounded-xl bg-zinc-900 text-white text-sm min-h-[48px]">{t("common.save")}</button>
              <button onClick={() => setEditing(null)} className="flex-1 px-3 py-3 rounded-xl border text-sm min-h-[48px]">{t("common.cancel")}</button>
            </div>
          </div>
        </div>
      )}
      <ConfirmSheet
        open={!!delTarget}
        title={t("market.deleteProdTitle")}
        body={t("market.deleteProdBody")}
        confirmLabel={t("common.delete")}
        danger
        busy={delBusy}
        onConfirm={confirmDelete}
        onClose={() => !delBusy && setDelTarget(null)}
      />
    </div>
  );
}
