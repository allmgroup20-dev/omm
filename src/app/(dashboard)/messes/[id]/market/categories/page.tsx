"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/i18n/provider";

type Cat = { id: string; name: string; slug: string; parentId: string | null; level: number };

export default function CategoriesPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLocale();
  const [cats, setCats] = useState<Cat[]>([]);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch(`/api/messes/${id}/market/categories`);
    const data = await res.json();
    if (res.ok) setCats(data.categories);
  }
  useEffect(() => { load(); }, [id]);

  async function add() {
    const res = await fetch(`/api/messes/${id}/market/categories`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, parentId: parentId || null }) });
    const data = await res.json();
    if (!res.ok) setMsg(data.error);
    else {
      setMsg(`${t("common.success")} — ${data.category.name}`);
      setName("");
      setParentId("");
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
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("market.catNamePh")} className="flex-1 border rounded-full px-4 py-2 text-sm" />
          <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="border rounded-full px-3 py-2 text-sm max-w-[180px]">
            <option value="">{t("market.rootParent")}</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{"—".repeat(c.level)} {c.name}</option>)}
          </select>
          <button onClick={add} className="px-5 py-2 rounded-full bg-zinc-900 text-white text-sm">{t("common.add")}</button>
        </div>
        <div className="space-y-1 max-h-[400px] overflow-auto">
          {cats.map((c) => (
            <div key={c.id} className="flex items-center gap-2 border rounded-lg px-3 py-2 text-sm" style={{ marginLeft: c.level * 16 }}>
              <span className="text-xs bg-zinc-100 rounded-full px-2 py-0.5">L{c.level}</span>
              <span className="font-medium">{c.name}</span>
              <span className="text-xs text-zinc-500">({c.slug})</span>
            </div>
          ))}
          {cats.length === 0 && <div className="text-center text-sm text-zinc-500 py-4">{t("market.noData")}</div>}
        </div>
      </div>
    </div>
  );
}
