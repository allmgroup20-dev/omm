"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/i18n/provider";

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
    if (!confirm("Delete category?")) return;
    const res = await fetch(`/api/messes/${id}/market/categories/${id2}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setMsg(data.error || "Delete failed");
    else {
      setMsg(t("common.success"));
      load();
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link href={`/messes/${id}/market`} className="text-sm text-zinc-500">← {t("market.hub")}</Link>
      <h1 className="text-lg font-bold">{t("market.catTitle")}</h1>
      <p className="text-xs text-zinc-500">{t("market.catDesc")}</p>
      {msg && <div className="rounded-xl border p-3 text-sm bg-white">{msg}</div>}
      <div className="bg-white border rounded-2xl p-5 space-y-3">
        <div className="flex flex-wrap gap-2 items-end">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("market.catNamePh")} className="flex-1 min-w-[180px] border rounded-full px-4 py-2 text-sm" />
          <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="border rounded-full px-3 py-2 text-sm max-w-[160px]">
            <option value="">{t("market.rootParent")}</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{"—".repeat(c.level)} {c.name}</option>)}
          </select>
          <input type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} placeholder="Sort" className="w-20 border rounded-full px-3 py-2 text-sm" title="Serial (sortOrder)" />
          <button onClick={add} className="px-5 py-2 rounded-full bg-zinc-900 text-white text-sm">{t("common.add")}</button>
        </div>
        <p className="text-xs text-zinc-500">যেকোনো ক্যাটাগরির অধীনে নতুন ক্যাটাগরি — প্যারেন্ট বেছে A-Z যত খুশি nesting (max 5), সিরিয়াল দিয়ে সাজান</p>
        <div className="space-y-1 max-h-[500px] overflow-auto">
          {cats.map((c) => (
            <div key={c.id} className="flex items-center gap-2 border rounded-lg px-3 py-2 text-sm bg-white" style={{ marginLeft: c.level * 16 }}>
              <span className="text-xs bg-zinc-100 rounded-full px-2 py-0.5">L{c.level}</span>
              <span className="text-xs bg-amber-100 rounded-full px-2 py-0.5">#{c.sortOrder}</span>
              <span className="font-medium flex-1 truncate" title={c.name}>{c.name}</span>
              <span className="text-xs text-zinc-500 truncate">({c.slug})</span>
              <button onClick={() => startEdit(c)} className="text-xs border rounded-full px-3 py-1 hover:bg-zinc-50">{t("common.edit")}</button>
              <button onClick={() => del(c.id)} className="text-xs border rounded-full px-3 py-1 hover:bg-red-50 text-red-600">{t("common.delete")}</button>
            </div>
          ))}
          {cats.length === 0 && <div className="text-center text-sm text-zinc-500 py-4">{t("market.noData")}</div>}
        </div>
      </div>

      {editing && (
        <div className="bg-white border rounded-2xl p-5 space-y-3">
          <div className="font-medium text-sm">Edit — {editing.name}</div>
          <div className="flex flex-wrap gap-2">
            <input value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1 border rounded-full px-4 py-2 text-sm" />
            <select value={editParentId} onChange={(e) => setEditParentId(e.target.value)} className="border rounded-full px-3 py-2 text-sm max-w-[160px]">
              <option value="">{t("market.rootParent")}</option>
              {cats.filter((x) => x.id !== editing.id).map((c) => <option key={c.id} value={c.id}>{"—".repeat(c.level)} {c.name}</option>)}
            </select>
            <input type="number" min={0} value={editSort} onChange={(e) => setEditSort(e.target.value)} className="w-20 border rounded-full px-3 py-2 text-sm" />
            <button onClick={saveEdit} className="px-5 py-2 rounded-full bg-zinc-900 text-white text-sm">{t("common.save")}</button>
            <button onClick={() => setEditing(null)} className="px-5 py-2 rounded-full border text-sm">{t("common.cancel")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
