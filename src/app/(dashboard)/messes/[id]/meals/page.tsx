"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/i18n/provider";
import { formatNumber } from "@/i18n/dict";

type MealType = { id: string; name: string; slug: string; isActive: boolean; sortOrder: number };
type Member = { id: string; userId: string; fullName: string; status: string };
type RecordRow = { memberId: string; mealTypeId: string; quantityScaled: number };

export default function MealsPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useLocale();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [mealTypes, setMealTypes] = useState<MealType[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [grid, setGrid] = useState<Record<string, Record<string, number>>>({}); // memberId -> mealTypeId -> qty
  const [locked, setLocked] = useState(false);
  const [closed, setClosed] = useState(false);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [defaults, setDefaults] = useState<Record<string, number>>({}); // mealTypeId -> qty
  const [defaultsSaving, setDefaultsSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);

  async function loadMeta() {
    const [mtRes, memRes] = await Promise.all([fetch(`/api/messes/${id}/meal-types`), fetch(`/api/messes/${id}/members`)]);
    const mtData = await mtRes.json();
    const memData = await memRes.json();
    if (mtRes.ok) setMealTypes(mtData.mealTypes.filter((x: MealType) => x.isActive).sort((a: MealType, b: MealType) => a.sortOrder - b.sortOrder));
    if (memRes.ok) setMembers(memData.members.filter((m: Member) => m.status === "active"));
  }

  async function loadDefaults() {
    const res = await fetch(`/api/messes/${id}/meals/defaults`);
    const data = await res.json().catch(() => null);
    if (res.ok && data?.defaults) {
      const map: Record<string, number> = {};
      for (const d of data.defaults as { mealTypeId: string; defaultScaled: number; isEnabled: boolean }[]) {
        map[d.mealTypeId] = d.isEnabled ? d.defaultScaled / 100 : 0;
      }
      setDefaults(map);
    } else {
      setDefaults({});
    }
  }

  async function loadDate(d: string) {
    setMsg("");
    const res = await fetch(`/api/messes/${id}/meals?date=${d}`);
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || t("errors.loadFail"));
      return;
    }
    setLocked(!!data.locked);
    setClosed(!!data.closed);
    const map: Record<string, Record<string, number>> = {};
    for (const r of data.meals as RecordRow[]) {
      if (!map[r.memberId]) map[r.memberId] = {};
      map[r.memberId][r.mealTypeId] = r.quantityScaled / 100;
    }
    setGrid(map);
  }

  useEffect(() => {
    loadMeta();
    loadDefaults();
  }, [id]);
  useEffect(() => {
    loadDate(date);
  }, [date, id]);

  function setCell(memberId: string, typeId: string, val: string) {
    const num = parseFloat(val);
    const qty = isNaN(num) ? 0 : Math.max(0, num);
    setGrid((prev) => {
      const copy = { ...prev };
      if (!copy[memberId]) copy[memberId] = {};
      copy[memberId] = { ...copy[memberId], [typeId]: qty };
      return copy;
    });
  }

  function bulkSet(qty: number, onlyTypeId?: string) {
    setGrid((prev) => {
      const copy: typeof prev = {};
      for (const m of members) {
        copy[m.id] = { ...(prev[m.id] || {}) };
        for (const t of mealTypes) {
          if (!onlyTypeId || t.id === onlyTypeId) copy[m.id][t.id] = qty;
          else if (prev[m.id]?.[t.id] !== undefined) copy[m.id][t.id] = prev[m.id][t.id];
        }
      }
      return copy;
    });
  }

  async function saveDefaults() {
    setDefaultsSaving(true);
    setMsg("");
    try {
      const payload = {
        defaults: mealTypes.map((t) => ({
          mealTypeId: t.id,
          defaultQty: defaults[t.id] ?? 0,
          isEnabled: (defaults[t.id] ?? 0) > 0,
        })),
      };
      const res = await fetch(`/api/messes/${id}/meals/defaults`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || JSON.stringify(data));
      setMsg("Auto template saved — every day will auto-fill until you change it");
      loadDefaults();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : t("errors.saveFail"));
    } finally {
      setDefaultsSaving(false);
    }
  }

  async function autoFillToday() {
    setAutoSaving(true);
    setMsg("");
    try {
      const res = await fetch(`/api/messes/${id}/meals/auto-fill`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || JSON.stringify(data));
      setMsg(`Auto-filled ${data.inserted} meals for ${date} (skipped ${data.skipped})`);
      loadDate(date);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : t("errors.saveFail"));
    } finally {
      setAutoSaving(false);
    }
  }

  async function copyPrevDay() {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    const prev = d.toISOString().slice(0, 10);
    const res = await fetch(`/api/messes/${id}/meals?date=${prev}`);
    const data = await res.json();
    if (!res.ok) return setMsg(t("meals.prevNotFound"));
    const map: typeof grid = {};
    for (const r of data.meals as RecordRow[]) {
      if (!map[r.memberId]) map[r.memberId] = {};
      map[r.memberId][r.mealTypeId] = r.quantityScaled / 100;
    }
    setGrid(map);
    setMsg(`Copied from ${prev}`);
  }

  async function save() {
    setSaving(true);
    setMsg("");
    try {
      const entries: { memberId: string; mealTypeId: string; quantity: number }[] = [];
      for (const m of members) {
        for (const t of mealTypes) {
          const q = grid[m.id]?.[t.id];
          if (q !== undefined) entries.push({ memberId: m.id, mealTypeId: t.id, quantity: q });
        }
      }
      const res = await fetch(`/api/messes/${id}/meals`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, entries }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || JSON.stringify(data));
      setMsg(`${t("common.success")} — ${formatNumber(data.upserted, locale)}${data.errors?.length ? `, errors: ${data.errors.join("; ")}` : ""}`);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : t("errors.saveFail"));
    } finally {
      setSaving(false);
    }
  }

  async function toggleLock() {
    if (locked) {
      const res = await fetch(`/api/messes/${id}/meals/locks?date=${date}`, { method: "DELETE" });
      if (res.ok) setLocked(false);
      else setMsg(t("meals.unlockFail"));
    } else {
      const res = await fetch(`/api/messes/${id}/meals/locks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date }) });
      if (res.ok) setLocked(true);
      else setMsg(t("meals.lockFail"));
    }
    loadDate(date);
  }

  async function bulkSetAllOne() {
    const res = await fetch(`/api/messes/${id}/meals/bulk`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, quantity: 1 }) });
    const data = await res.json();
    if (res.ok) {
      setMsg(`${t("common.success")} — ${formatNumber(data.updated, locale)}`);
      loadDate(date);
    } else setMsg(data.error);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href={`/messes/${id}`} className="text-sm text-zinc-500">← {t("nav.overview")}</Link>
        <span className="text-sm text-zinc-400">|</span>
        <Link href={`/messes/${id}/meals/matrix`} className="text-sm underline">{t("meals.matrixLink")}</Link>
        <Link href={`/messes/${id}/meal-types`} className="text-sm underline">{t("meals.typesLink")}</Link>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold">{t("meals.dailyTitle")}</h1>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border rounded-full px-4 py-2 text-sm" />
      </div>

      {(locked || closed) && <div className="rounded-xl border p-3 text-sm bg-amber-50">{locked ? t("meals.lockedMsg") : ""} {closed ? t("meals.closedMsg") : ""}{t("meals.saveNeedManager")}</div>}
      {msg && <div className="rounded-xl border p-3 text-sm bg-white">{msg}</div>}

      <div className="bg-white border rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm">Auto template — প্রতিদিন auto</div>
            <div className="text-xs text-zinc-500">একবার সেভ করুন (যেমন লাঞ্চ 1, ডিনার 1, ব্রেকফাস্ট 0) — প্রতিদিন নতুন তারিখে Auto-fill চাপলে বা খালি দিনে auto উঠবে; যেকোনো দিন এডিট করা যাবে, টেমপ্লেটও এডিট করা যাবে</div>
          </div>
          <Link href={`/messes/${id}/meal-types`} className="text-xs underline">মিল টাইপ এডিট (ব্রেকফাস্ট বাদ দিতে Deactivate)</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {mealTypes.map((t) => (
            <div key={t.id} className="border rounded-xl p-3 bg-zinc-50">
              <div className="text-xs font-medium">{t.name}</div>
              <select value={String(defaults[t.id] ?? 1)} onChange={(e) => setDefaults((prev) => ({ ...prev, [t.id]: parseFloat(e.target.value) }))} className="w-full border rounded-lg px-2 py-1.5 text-sm mt-1 bg-white">
                <option value="0">0 — বাদ</option>
                <option value="0.5">0.5</option>
                <option value="1">1</option>
                <option value="1.5">1.5</option>
                <option value="2">2</option>
              </select>
              <div className="text-[11px] text-zinc-500 mt-1">{(defaults[t.id] ?? 1) === 0 ? "Auto-তে বাদ" : "Auto-তে " + (defaults[t.id] ?? 1)}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={saveDefaults} disabled={defaultsSaving} className="flex-1 rounded-full bg-zinc-900 text-white py-2.5 text-sm font-medium disabled:opacity-50">{defaultsSaving ? "সেভ হচ্ছে..." : "টেমপ্লেট সেভ করুন"}</button>
          <button onClick={autoFillToday} disabled={autoSaving} className="px-6 rounded-full border bg-white text-sm disabled:opacity-50">{autoSaving ? "ভরছে..." : `Auto-fill ${date}`}</button>
        </div>
        <p className="text-xs text-zinc-500">টিপ: ব্রেকফাস্ট আগামী মাস থেকে বাদ দিতে `মিল টাইপ এডিট` এ ব্রেকফাস্ট Deactivate করুন — পুরনো হিসাব থাকবে, নতুন দিনে কলাম আসবে না</p>
      </div>

      <div className="bg-white border rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap gap-2 text-xs">
          <button onClick={() => bulkSet(1)} className="border rounded-full px-3 py-1 hover:bg-zinc-50">{t("meals.setAll1")}</button>
          <button onClick={() => bulkSet(0)} className="border rounded-full px-3 py-1 hover:bg-zinc-50">{t("meals.clearAll")}</button>
          <button onClick={bulkSetAllOne} className="border rounded-full px-3 py-1 hover:bg-zinc-50">{t("meals.bulkApi")}</button>
          <button onClick={copyPrevDay} className="border rounded-full px-3 py-1 hover:bg-zinc-50">{t("meals.copyPrev")}</button>
          {mealTypes.map((t) => (
            <button key={t.id} onClick={() => bulkSet(1, t.id)} className="border rounded-full px-3 py-1 bg-zinc-50">{t.name}=1</button>
          ))}
          <button onClick={toggleLock} className="border rounded-full px-3 py-1 bg-amber-50">{locked ? t("meals.unlock") : t("meals.lock")}</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">{t("meals.memberCol")}</th>
                {mealTypes.map((t) => (
                  <th key={t.id} className="p-2 text-center font-medium">{t.name}</th>
                ))}
                <th className="p-2 text-center">{t("meals.totalCol")}</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const total = mealTypes.reduce((a, t) => a + (grid[m.id]?.[t.id] ?? 0), 0);
                return (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="p-2 font-medium text-xs">{m.fullName}</td>
                    {mealTypes.map((t) => (
                      <td key={t.id} className="p-1">
                        <input type="number" min={0} step={0.5} value={grid[m.id]?.[t.id] ?? ""} onChange={(e) => setCell(m.id, t.id, e.target.value)} className="w-20 border rounded-lg px-2 py-1.5 text-center text-sm" placeholder="0" />
                      </td>
                    ))}
                    <td className="p-2 text-center font-semibold">{total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {members.length === 0 && <div className="p-6 text-center text-sm text-zinc-500">{t("meals.noActiveMembers")}</div>}
        </div>

        <div className="flex gap-2">
          <button onClick={save} disabled={saving} className="flex-1 rounded-full bg-zinc-900 text-white py-3 text-sm font-medium disabled:opacity-50">{saving ? t("meals.saving") : t("meals.saveBtn")}</button>
          <button onClick={() => loadDate(date)} className="px-6 rounded-full border bg-white text-sm">{t("meals.reloadBtn")}</button>
        </div>
        <p className="text-xs text-zinc-500">{t("meals.precisionNote")}</p>
      </div>
    </div>
  );
}
