"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type MT = { id: string; name: string; slug: string; sortOrder: number; isActive: boolean };

export default function MealTypesPage() {
  const { id } = useParams<{ id: string }>();
  const [types, setTypes] = useState<MT[]>([]);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch(`/api/messes/${id}/meal-types`);
    const data = await res.json();
    if (res.ok) setTypes(data.mealTypes);
  }
  useEffect(() => { load(); }, [id]);

  async function add() {
    if (!name.trim()) return;
    const res = await fetch(`/api/messes/${id}/meal-types`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const data = await res.json();
    if (!res.ok) setMsg(data.error);
    else {
      setMsg(`Added ${data.mealType.name}`);
      setName("");
      load();
    }
  }
  async function toggleActive(mt: MT) {
    await fetch(`/api/messes/${id}/meal-types/${mt.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !mt.isActive }) });
    load();
  }
  async function archive(mt: MT) {
    if (!confirm(`Archive ${mt.name}? History preserved.`)) return;
    await fetch(`/api/messes/${id}/meal-types/${mt.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <Link href={`/messes/${id}/meals`} className="text-sm text-zinc-500">← Meals</Link>
      <h1 className="text-lg font-bold">Meal Types — {types.length} slots (configurable)</h1>
      <p className="text-xs text-zinc-500">যেমন: ১ বেলা = Dinner, ২ বেলা = Lunch+Dinner, ৩ বেলা = Breakfast+Lunch+Dinner, বা Custom (Sehri/Iftar)</p>
      {msg && <div className="rounded-xl border p-3 text-sm bg-white">{msg}</div>}
      <div className="bg-white border rounded-2xl p-5 space-y-3">
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="নতুন Meal Type নাম (যেমন Snacks)" className="flex-1 border rounded-full px-4 py-2 text-sm" />
          <button onClick={add} className="px-5 py-2 rounded-full bg-zinc-900 text-white text-sm">Add</button>
        </div>
        <div className="space-y-2">
          {types.map((mt) => (
            <div key={mt.id} className="flex items-center justify-between border rounded-xl px-4 py-3">
              <div>
                <div className="font-medium text-sm">{mt.name} <span className="text-xs text-zinc-500">({mt.slug})</span></div>
                <div className="text-xs text-zinc-500">Order {mt.sortOrder} • {mt.isActive ? "Active" : "Archived"}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggleActive(mt)} className="text-xs border rounded-full px-3 py-1">{mt.isActive ? "Deactivate" : "Activate"}</button>
                <button onClick={() => archive(mt)} className="text-xs border rounded-full px-3 py-1 bg-amber-50">Archive</button>
              </div>
            </div>
          ))}
          {types.length === 0 && <div className="text-sm text-zinc-500 text-center py-4">No meal types</div>}
        </div>
        <p className="text-xs text-zinc-500">Archived types hidden from entry grid but historical records preserved. Never hard-deleted.</p>
      </div>
    </div>
  );
}
