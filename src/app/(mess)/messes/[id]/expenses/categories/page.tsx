"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/i18n/provider";

type Cat = { id: string; name: string; slug: string };

export default function ExpenseCategoriesPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLocale();
  const [cats, setCats] = useState<Cat[]>([]);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch(`/api/messes/${id}/expenses/categories`);
    const data = await res.json();
    if (res.ok) setCats(data.categories);
  }
  useEffect(() => { load(); }, [id]);

  async function add() {
    const res = await fetch(`/api/messes/${id}/expenses/categories`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const data = await res.json();
    if (!res.ok) setMsg(data.error);
    else {
      setMsg(`${t("common.success")} — ${data.category.name}`);
      setName("");
      load();
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link href={`/messes/${id}/expenses`} className="text-sm text-zinc-500">← {t("expenses.title")}</Link>
      <h1 className="text-lg font-bold">{t("expenses.catTitle")}</h1>
      <p className="text-xs text-zinc-500">{t("expenses.catDesc")}</p>
      {msg && <div className="rounded-xl border p-3 text-sm bg-white">{msg}</div>}
      <div className="bg-white border rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("expenses.catNamePh")} className="flex-1 border rounded-full px-4 py-2 text-sm" />
          <button onClick={add} className="px-5 py-2 rounded-full bg-zinc-900 text-white text-sm">{t("common.add")}</button>
        </div>
        <div className="space-y-1">
          {cats.map((c) => (
            <div key={c.id} className="border rounded-lg px-3 py-2 text-sm flex justify-between"><span>{c.name}</span><span className="text-xs text-zinc-500">{c.slug}</span></div>
          ))}
          {cats.length === 0 && <div className="text-center text-sm text-zinc-500 py-4">{t("expenses.noCats")}</div>}
        </div>
      </div>
    </div>
  );
}
