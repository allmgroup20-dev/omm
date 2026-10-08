"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/i18n/provider";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";

type Cat = { id: string; name: string; slug: string; parentId: string | null; level: number; sortOrder: number };

export default function CategoriesPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLocale();
  const [cats, setCats] = useState<Cat[]>([]);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [editing, setEditing] = useState<Cat | null>(null);
  const [editName, setEditName] = useState("");
  const [editParentId, setEditParentId] = useState("");
  const [editSort, setEditSort] = useState("0");
  const [msg, setMsg] = useState("");
  const [delTarget, setDelTarget] = useState<string | null>(null);
  const [delBusy, setDelBusy] = useState(false);

  async function load() {
    const res = await fetch(`/api/messes/${id}/market/categories`);
    const data = await res.json();
    if (res.ok) setCats(data.categories);
  }
  useEffect(() => { load(); }, [id]);

  async function add() {
    const so = parseInt(sortOrder) || 0;
    const res = await fetch(`/api/messes/${id}/market/categories`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, parentId: parentId || null, sortOrder: so }) });
    const data = await res.json();
    if (!res.ok) setMsg(data.error);
    else {
      setMsg(`${t("common.success")} — ${data.category.name}`);
      setName("");
      setParentId("");
      setSortOrder("0");
      load();
    }
  }

  function startEdit(c: Cat) {
    setEditing(c);
    setEditName(c.name);
    setEditParentId(c.parentId || "");
    setEditSort(String(c.sortOrder ?? 0));
    setTimeout(() => document.getElementById("cat-edit-name")?.focus(), 50);
  }

  async function saveEdit() {
    if (!editing) return;
    const res = await fetch(`/api/messes/${id}/market/categories/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editName, parentId: editParentId || null, sortOrder: parseInt(editSort) || 0 }) });
    const data = await res.json();
    if (!res.ok) setMsg(data.error);
    else {
      setMsg(`${t("common.success")} — ${data.category.name}`);
      setEditing(null);
      load();
    }
  }

  async function del(id2: string) {
    setDelTarget(id2);
  }

  async function confirmDelete() {
    if (!delTarget) return;
    setDelBusy(true);
    const res = await fetch(`/api/messes/${id}/market/categories/${delTarget}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setDelBusy(false);
    if (!res.ok) setMsg(typeof data.error === "string" && data.error ? data.error : t("market.deleteFail"));
    else {
      setMsg(t("common.success"));
      setDelTarget(null);
      load();
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link href={`/messes/${id}/market/add`} className="text-sm text-zinc-500">← {t("market.addEntry")}</Link>
      <h1 className="text-lg font-bold">{t("market.catTitle")}</h1>
      <p className="text-xs text-zinc-500">{t("market.catDesc")}</p>
      {msg && <div className="rounded-xl border p-3 text-sm bg-white">{msg}</div>}
      <div className="bg-white border rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("market.catNamePh")} aria-label={t("market.catNamePh")} className="flex-1 min-w-0 border rounded-xl px-4 py-3 text-base sm:text-sm min-h-[48px]" />
          <div className="flex gap-2">
            <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="flex-1 sm:flex-none border rounded-xl px-3 py-3 text-base sm:text-sm min-h-[48px] bg-white sm:max-w-[160px]" aria-label={t("market.parentLabel")}>
              <option value="">{t("market.rootParent")}</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{"—".repeat(c.level)} {c.name}</option>)}
            </select>
            <input type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} placeholder={t("market.sortPh")} title={t("market.sortHint")} aria-label={t("market.sortPh")} className="w-24 border rounded-xl px-3 py-3 text-base sm:text-sm min-h-[48px]" />
            <button onClick={add} className="px-6 rounded-xl bg-zinc-900 text-white text-sm min-h-[48px]">{t("common.add")}</button>
          </div>
        </div>
        <details className="text-xs">
          <summary className="text-zinc-500 cursor-pointer py-1 min-h-[44px] inline-flex items-center">{t("market.catDesc")}</summary>
          <p className="text-zinc-500 pb-1">{t("market.catNestingHint")}</p>
        </details>
        <div className="space-y-1 max-h-[500px] overflow-auto">
          {cats.map((c) => (
            <div key={c.id} className="flex items-center gap-2 border rounded-lg px-3 py-2 text-sm bg-white overflow-hidden" style={{ marginLeft: Math.min(c.level, 4) * 16 }}>
              <span className="font-medium flex-1 truncate min-w-0" title={c.name}>{c.name}</span>
              <button onClick={() => startEdit(c)} className="text-xs border rounded-full px-4 py-2.5 hover:bg-zinc-50 min-h-[44px] shrink-0">{t("common.edit")}</button>
              <button onClick={() => del(c.id)} className="text-xs border rounded-full px-4 py-2.5 hover:bg-red-50 text-red-600 min-h-[44px] shrink-0">{t("common.delete")}</button>
            </div>
          ))}
          {cats.length === 0 && <div className="text-center text-sm text-zinc-500 py-4">{t("market.noData")}</div>}
        </div>
      </div>

      {editing && (
        <div className="bg-white border rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="font-medium text-sm">{t("common.edit")} — {editing.name}</div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input id="cat-edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} aria-label={t("market.catNamePh")} className="flex-1 border rounded-xl px-4 py-3 text-base sm:text-sm min-h-[48px]" />
            <div className="flex gap-2">
              <select value={editParentId} onChange={(e) => setEditParentId(e.target.value)} className="flex-1 sm:flex-none border rounded-xl px-3 py-3 text-base sm:text-sm min-h-[48px] bg-white" aria-label={t("market.parentLabel")}>
                <option value="">{t("market.rootParent")}</option>
                {cats.filter((x) => x.id !== editing.id).map((c) => <option key={c.id} value={c.id}>{"—".repeat(c.level)} {c.name}</option>)}
              </select>
              <input type="number" min={0} value={editSort} onChange={(e) => setEditSort(e.target.value)} placeholder={t("market.sortPh")} title={t("market.sortHint")} aria-label={t("market.sortPh")} className="w-24 border rounded-xl px-3 py-3 text-base sm:text-sm min-h-[48px]" />
            </div>
            <div className="flex gap-2">
              <button onClick={saveEdit} className="flex-1 rounded-full bg-zinc-900 text-white text-sm min-h-[48px]">{t("common.save")}</button>
              <button onClick={() => setEditing(null)} className="flex-1 rounded-full border text-sm min-h-[48px]">{t("common.cancel")}</button>
            </div>
          </div>
        </div>
      )}
      <ConfirmSheet
        open={!!delTarget}
        title={t("market.deleteCatTitle")}
        body={t("market.deleteCatBody")}
        confirmLabel={t("common.delete")}
        danger
        busy={delBusy}
        onConfirm={confirmDelete}
        onClose={() => !delBusy && setDelTarget(null)}
      />
    </div>
  );
}
