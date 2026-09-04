"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Cat = { id: string; name: string };
type Prod = { id: string; name: string; slug: string; categoryId: string | null; defaultUnit: string; isArchived: boolean };

const UNITS = ["kg", "gram", "litre", "ml", "piece", "dozen", "packet", "bottle", "box", "custom"];

export default function ProductsPage() {
  const { id } = useParams<{ id: string }>();
  const [cats, setCats] = useState<Cat[]>([]);
  const [prods, setProds] = useState<Prod[]>([]);
  const [name, setName] = useState("");
  const [catId, setCatId] = useState("");
  const [unit, setUnit] = useState("kg");
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
    const res = await fetch(`/api/messes/${id}/market/products`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, categoryId: catId, defaultUnit: unit }) });
    const data = await res.json();
    if (!res.ok) setMsg(data.error);
    else {
      setMsg(`Added ${data.product.name}`);
      setName("");
      load();
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link href={`/messes/${id}/market`} className="text-sm text-zinc-500">← Market Hub</Link>
      <h1 className="text-lg font-bold">Products</h1>
      <p className="text-xs text-zinc-500">প্রতি category-তে product — যেমন মাছ → ইলিশ, রুই, কাতলা</p>
      {msg && <div className="rounded-xl border p-3 text-sm bg-white">{msg}</div>}
      <div className="bg-white border rounded-2xl p-5 space-y-3">
        <div className="grid grid-cols-12 gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name (e.g. ইলিশ)" className="col-span-5 border rounded-full px-4 py-2 text-sm" />
          <select value={catId} onChange={(e) => setCatId(e.target.value)} className="col-span-4 border rounded-full px-3 py-2 text-sm">
            <option value="">— Category —</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={unit} onChange={(e) => setUnit(e.target.value)} className="col-span-2 border rounded-full px-3 py-2 text-sm">
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
          <button onClick={add} className="col-span-1 px-2 py-2 rounded-full bg-zinc-900 text-white text-sm">+</button>
        </div>
        <div className="space-y-1 max-h-[400px] overflow-auto">
          {prods.map((p) => (
            <div key={p.id} className="flex items-center justify-between border rounded-lg px-3 py-2 text-sm">
              <span>{p.name} <span className="text-xs text-zinc-500">({p.defaultUnit})</span></span>
              <span className="text-xs text-zinc-500">{cats.find((c) => c.id === p.categoryId)?.name || "—"}</span>
            </div>
          ))}
          {prods.length === 0 && <div className="text-center text-sm text-zinc-500 py-4">No products</div>}
        </div>
      </div>
    </div>
  );
}
